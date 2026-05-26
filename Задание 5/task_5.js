let loopON = true;

const state = {
    outer: [],          // замкнутый внешний контур
    holes: [],          // массив дырок, каждая дырка — массив точек
    active: [],         // текущий незамкнутый контур
    activeKind: null,   // null | 'outer' | 'hole'
    outerClosed: false,
    triangles: [],
    colors: [],
    status: 'ЛКМ — внешний контур, ПКМ — дырка, Enter — замкнуть текущий контур',
};

let M = [0, 0];

// const dlineFunc = drawLine;
const dlineFunc = drawSmoothLine;

const EPS = 1e-6;
const CLOSE_DIST = 12;
const CLOSE_DIST2 = CLOSE_DIST * CLOSE_DIST;

document.addEventListener("DOMContentLoaded", function () {
    setCurrentCanvas("myCanvas");

    canvas.width = 300;
    canvas.height = Math.floor(canvas.width / 1.5);
    updateCanvasImage();

    canvas.onmousemove = function (e) {
        M = roundPoint(getCanvasMousePoint(e));
    };

    canvas.onmousedown = function (e) {
        const p = roundPoint(getCanvasMousePoint(e));

        if (e.button === 0) {
            handleLeftClick(p);
        } else if (e.button === 2) {
            handleRightClick(p);
        }
    };

    canvas.oncontextmenu = function (e) {
        e.preventDefault();
        return false;
    };

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") resetAll();
        if (e.key === "Enter") closeActiveContour();
    });

    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) resetBtn.onclick = resetAll;

    d3.select("body").insert("div", "div").attr("id", "fps").node().innerHTML = "fps";

    loop();
});

let lastTime = 0;

const loop = function (time) {
    const dt = time - lastTime;
    lastTime = time;

    if (dt > 0) {
        const fpsEl = d3.select("#fps").node();
        if (fpsEl) fpsEl.innerHTML = `fps: ${Math.floor(1000 / dt)}`;
    }

    dataUpdateIteration(dt);
    canvasUpdateIteration();

    if (loopON) requestAnimationFrame(loop);
};

function dataUpdateIteration(dt) {
    const xEl = d3.select("#x").node();
    const yEl = d3.select("#y").node();
    const infoEl = d3.select("#info").node();

    if (xEl) xEl.innerHTML = "x: " + M[0];
    if (yEl) yEl.innerHTML = "y: " + M[1];
    if (infoEl) infoEl.innerHTML = state.status;
}

function canvasUpdateIteration() {
    clearCanvas();

    drawGeometry();

    drawPixel(M[0], M[1], 0, 255, 0, 1);
    updateCanvasContext();
}

function drawGeometry() {
    // заполненные треугольники
    for (let i = 0; i < state.triangles.length; ++i) {
        fillTriangle(state.triangles[i], state.colors[i]);
    }

    // уже замкнутый внешний контур
    if (state.outerClosed && state.outer.length >= 2) {
        drawClosedPolyline(state.outer, 20, 120, 255, 1, true);
    }

    // уже замкнутые дырки
    for (const hole of state.holes) {
        if (hole.length >= 2) {
            drawClosedPolyline(hole, 230, 120, 20, 1, true);
        }
    }

    // активный, ещё не замкнутый контур
    if (state.active.length >= 2) {
        const color = state.activeKind === 'hole' ? [230, 120, 20, 1] : [20, 120, 255, 1];
        drawClosedPolyline(state.active, ...color, false);
    }

    // ребро до мыши
    if (state.active.length >= 1) {
        const last = state.active[state.active.length - 1];
        const color = state.activeKind === 'hole' ? [230, 170, 70, 1] : [150, 150, 150, 1];
        dlineFunc(last[0], last[1], M[0], M[1], ...color);
    }

    // точки внешнего контура
    for (const p of state.outer) {
        drawPixel(p[0], p[1], 0, 0, 255, 1);
    }

    // точки дырок
    for (const hole of state.holes) {
        for (const p of hole) {
            drawPixel(p[0], p[1], 255, 140, 0, 1);
        }
    }

    // точки активного контура
    for (const p of state.active) {
        const c = state.activeKind === 'hole' ? [255, 170, 0] : [0, 0, 255];
        drawPixel(p[0], p[1], c[0], c[1], c[2], 1);
    }

    // подсветка стартовой точки активного контура
    if (state.active.length >= 1) {
        const p = state.active[0];
        drawPixel(p[0], p[1], 255, 0, 0, 1);
    }

    if (state.outer.length >= 1 && !state.outerClosed) {
        const p = state.outer[0];
        drawPixel(p[0], p[1], 255, 0, 0, 1);
    }
}

function handleLeftClick(p) {
    if (!state.outerClosed) {
        // внешний контур
        if (state.activeKind === 'hole') {
            return;
        }

        state.activeKind = 'outer';

        if (state.active.length >= 3 && nearPoint(state.active[0], p)) {
            closeOuterContour();
            return;
        }

        state.active.push(p);
        recomputeTriangulation();
        return;
    }

    // после замыкания внешнего контура ЛКМ ничего не делает
}

function handleRightClick(p) {
    if (!state.outerClosed) return;

    // старт / продолжение дырки
    if (state.activeKind !== 'hole' && state.active.length === 0) {
        if (!pointInPolygon(p, state.outer)) return;
        if (pointInAnyHole(p, state.holes)) return;

        state.activeKind = 'hole';
        state.active = [p];
        recomputeTriangulation();
        return;
    }

    if (state.activeKind === 'hole') {
        if (state.active.length >= 3 && nearPoint(state.active[0], p)) {
            closeHoleContour();
            return;
        }

        if (!pointInPolygon(p, state.outer)) return;
        if (pointInAnyHole(p, state.holes)) return;

        state.active.push(p);
        recomputeTriangulation();
    }
}

function closeActiveContour() {
    if (state.activeKind === 'outer' && !state.outerClosed) {
        if (state.active.length >= 3) {
            closeOuterContour();
        }
        return;
    }

    if (state.activeKind === 'hole') {
        if (state.active.length >= 3) {
            closeHoleContour();
        }
    }
}

function closeOuterContour() {
    if (state.active.length < 3) return;

    state.outer = state.active.slice();
    state.active = [];
    state.activeKind = null;
    state.outerClosed = true;
    state.status = "ПКМ — добавить дырку";
    recomputeTriangulation();
}

function closeHoleContour() {
    if (state.active.length < 3) return;

    const hole = state.active.slice();
    state.holes.push(hole);
    state.active = [];
    state.activeKind = null;
    state.status = "Дырка добавлена. ПКМ — добавить ещё";
    recomputeTriangulation();
}

function resetAll() {
    state.outer = [];
    state.holes = [];
    state.active = [];
    state.activeKind = null;
    state.outerClosed = false;
    state.triangles = [];
    state.colors = [];
    state.status = "ЛКМ — внешний контур, Enter — замкнуть текущий контур";
}

function recomputeTriangulation() {
    state.triangles = [];
    state.colors = [];

    if (!state.outerClosed || state.outer.length < 3) return;

    let contour = state.outer.slice();

    if (state.holes.length === 0) {
        if (isConvexPolygon(contour)) {
            state.triangles = triangulateFan(contour);
        } else if (isSimplePolygon(contour)) {
            state.triangles = earClip(contour);
        }
    } else {
        contour = mergeHolesIntoContour(contour, state.holes);
        state.triangles = earClip(contour);
    }

    state.colors = state.triangles.map(() => randomRGBA(0.65));
}

function triangulateFan(pts) {
    const tris = [];
    if (pts.length < 3) return tris;

    for (let i = 1; i + 1 < pts.length; ++i) {
        tris.push([pts[0], pts[i], pts[i + 1]]);
    }
    return tris;
}

function earClip(points) {
    const pts = removeConsecutiveDuplicates(points);
    if (pts.length < 3) return [];

    const result = [];
    const V = [];
    for (let i = 0; i < pts.length; ++i) V.push(i);

    const orient = polygonArea2(pts) >= 0 ? 1 : -1;
    let guard = 0;
    const maxGuard = pts.length * pts.length * 5;

    while (V.length > 3 && guard < maxGuard) {
        let earFound = false;

        for (let i = 0; i < V.length; ++i) {
            const i0 = V[(i - 1 + V.length) % V.length];
            const i1 = V[i];
            const i2 = V[(i + 1) % V.length];

            const a = pts[i0];
            const b = pts[i1];
            const c = pts[i2];

            if (!isConvexByOrient(a, b, c, orient)) continue;
            if (!isEarTriangle(a, b, c, pts, V)) continue;

            result.push([a, b, c]);
            V.splice(i, 1);
            earFound = true;
            break;
        }

        if (!earFound) break;
        guard++;
    }

    if (V.length === 3) {
        result.push([pts[V[0]], pts[V[1]], pts[V[2]]]);
    }

    return result;
}

function isEarTriangle(a, b, c, pts, indices) {
    for (const idx of indices) {
        const p = pts[idx];
        if (p === a || p === b || p === c) continue;
        if (pointInTriangleInclusive(p, a, b, c)) return false;
    }
    return true;
}

function isConvexPolygon(pts) {
    if (pts.length < 3) return false;

    let sign = 0;
    for (let i = 0; i < pts.length; ++i) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        const c = pts[(i + 2) % pts.length];
        const cr = orient(a, b, c);
        if (Math.abs(cr) < EPS) continue;
        const s = Math.sign(cr);
        if (sign === 0) sign = s;
        else if (sign !== s) return false;
    }
    return true;
}

function isSimplePolygon(pts) {
    if (pts.length < 4) return true;

    for (let i = 0; i < pts.length; ++i) {
        const a1 = pts[i];
        const a2 = pts[(i + 1) % pts.length];

        for (let j = i + 1; j < pts.length; ++j) {
            if (Math.abs(i - j) <= 1) continue;
            if (i === 0 && j === pts.length - 1) continue;

            const b1 = pts[j];
            const b2 = pts[(j + 1) % pts.length];

            if (segmentsIntersect(a1, a2, b1, b2)) return false;
        }
    }

    return true;
}

function mergeHolesIntoContour(outer, holes) {
    let contour = orientCCW(outer.slice());

    for (const holeRaw of holes) {
        const hole = orientCW(holeRaw.slice());
        contour = mergeSingleHole(contour, hole);
    }

    return contour;
}

function mergeSingleHole(outer, hole) {
    if (outer.length < 3 || hole.length < 3) return outer.slice();

    const hIdx = rightmostVertexIndex(hole);
    const h = hole[hIdx];

    const oIdx = findVisibleOuterVertexIndex(outer, hole, hIdx);

    if (oIdx === -1) {
        // запасной вариант — ближайшая вершина
        let best = 0;
        let bestD = Infinity;
        for (let i = 0; i < outer.length; ++i) {
            const d = dist2(h, outer[i]);
            if (d < bestD) {
                bestD = d;
                best = i;
            }
        }
        return spliceHole(outer, hole, best, hIdx);
    }

    return spliceHole(outer, hole, oIdx, hIdx);
}

function spliceHole(outer, hole, oIdx, hIdx) {
    const result = [];

    // outer prefix including bridge vertex
    for (let i = 0; i <= oIdx; ++i) result.push(outer[i]);

    // bridge to hole
    result.push(hole[hIdx]);

    // walk around hole, excluding the starting vertex
    for (let step = 1; step < hole.length; ++step) {
        result.push(hole[(hIdx + step) % hole.length]);
    }

    // close the hole loop back to its starting vertex
    result.push(hole[hIdx]);

    // bridge back to outer bridge vertex
    result.push(outer[oIdx]);

    // outer suffix
    for (let i = oIdx + 1; i < outer.length; ++i) result.push(outer[i]);

    return result;
}

function findVisibleOuterVertexIndex(outer, hole, hIdx) {
    const h = hole[hIdx];
    let bestIdx = -1;
    let bestDist = Infinity;

    for (let i = 0; i < outer.length; ++i) {
        const o = outer[i];

        if (o[0] <= h[0]) continue;

        if (!isVisibleBridge(h, o, outer, hole, hIdx, i)) continue;

        const d = dist2(h, o);
        if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
        }
    }

    return bestIdx;
}

function isVisibleBridge(h, o, outer, hole, hIdx, oIdx) {
    const segA = h;
    const segB = o;

    // пересечения с внешним контуром
    for (let i = 0; i < outer.length; ++i) {
        const a = outer[i];
        const b = outer[(i + 1) % outer.length];

        if (i === oIdx || (i + 1) % outer.length === oIdx) continue;

        if (segmentsIntersect(segA, segB, a, b)) return false;
    }

    // пересечения с дыркой
    for (let i = 0; i < hole.length; ++i) {
        const a = hole[i];
        const b = hole[(i + 1) % hole.length];

        if (i === hIdx || (i + 1) % hole.length === hIdx) continue;

        if (segmentsIntersect(segA, segB, a, b)) return false;
    }

    const mid = [(segA[0] + segB[0]) * 0.5, (segA[1] + segB[1]) * 0.5];
    if (!pointInPolygon(mid, outer)) return false;

    return true;
}

function orientCCW(pts) {
    if (polygonArea2(pts) < 0) return pts.reverse();
    return pts;
}

function orientCW(pts) {
    if (polygonArea2(pts) > 0) return pts.reverse();
    return pts;
}

function polygonArea2(pts) {
    let s = 0;
    for (let i = 0; i < pts.length; ++i) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        s += a[0] * b[1] - b[0] * a[1];
    }
    return s;
}

function rightmostVertexIndex(pts) {
    let idx = 0;
    for (let i = 1; i < pts.length; ++i) {
        if (pts[i][0] > pts[idx][0] || (pts[i][0] === pts[idx][0] && pts[i][1] < pts[idx][1])) {
            idx = i;
        }
    }
    return idx;
}

function pointInAnyHole(p, holes) {
    for (const hole of holes) {
        if (pointInPolygon(p, hole)) return true;
    }
    return false;
}

function pointInPolygon(p, poly) {
    let inside = false;

    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0], yi = poly[i][1];
        const xj = poly[j][0], yj = poly[j][1];

        const intersect = ((yi > p[1]) !== (yj > p[1])) &&
            (p[0] < (xj - xi) * (p[1] - yi) / ((yj - yi) || EPS) + xi);

        if (intersect) inside = !inside;
    }

    return inside;
}

function pointInTriangleInclusive(p, a, b, c) {
    const o1 = orient(a, b, p);
    const o2 = orient(b, c, p);
    const o3 = orient(c, a, p);

    const hasNeg = (o1 < -EPS) || (o2 < -EPS) || (o3 < -EPS);
    const hasPos = (o1 > EPS) || (o2 > EPS) || (o3 > EPS);

    return !(hasNeg && hasPos);
}

function isConvexByOrient(a, b, c, orientSign) {
    const cr = orient(a, b, c);
    return orientSign > 0 ? cr > EPS : cr < -EPS;
}

function orient(a, b, c) {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function segmentsIntersect(p1, p2, p3, p4) {
    const o1 = orient(p1, p2, p3);
    const o2 = orient(p1, p2, p4);
    const o3 = orient(p3, p4, p1);
    const o4 = orient(p3, p4, p2);

    if ((o1 * o2 < 0) && (o3 * o4 < 0)) return true;

    if (Math.abs(o1) < EPS && onSegment(p1, p2, p3)) return true;
    if (Math.abs(o2) < EPS && onSegment(p1, p2, p4)) return true;
    if (Math.abs(o3) < EPS && onSegment(p3, p4, p1)) return true;
    if (Math.abs(o4) < EPS && onSegment(p3, p4, p2)) return true;

    return false;
}

function onSegment(a, b, p) {
    return (
        Math.min(a[0], b[0]) - EPS <= p[0] && p[0] <= Math.max(a[0], b[0]) + EPS &&
        Math.min(a[1], b[1]) - EPS <= p[1] && p[1] <= Math.max(a[1], b[1]) + EPS
    );
}

function fillTriangle(tri, rgba) {
    const [a, b, c] = tri;
    const minX = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
    const maxX = Math.min(canvas.width - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const minY = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
    const maxY = Math.min(canvas.height - 1, Math.ceil(Math.max(a[1], b[1], c[1])));

    for (let y = minY; y <= maxY; ++y) {
        for (let x = minX; x <= maxX; ++x) {
            if (pointInTriangleInclusive([x + 0.5, y + 0.5], a, b, c)) {
                drawPixel(x, y, rgba[0], rgba[1], rgba[2], rgba[3]);
            }
        }
    }
}

function randomRGBA(alpha = 0.6) {
    const hue = Math.random();
    const [r, g, b] = hsvToRgb(hue, 0.65, 0.95);
    return [r, g, b, alpha];
}

function hsvToRgb(h, s, v) {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    let r, g, b;

    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function nearPoint(a, b) {
    return dist2(a, b) <= CLOSE_DIST2;
}

function dist2(a, b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    return dx * dx + dy * dy;
}

function roundPoint(p) {
    return [Math.round(p[0]), Math.round(p[1])];
}

function removeConsecutiveDuplicates(pts) {
    if (pts.length === 0) return [];
    const res = [pts[0]];
    for (let i = 1; i < pts.length; ++i) {
        if (dist2(pts[i], res[res.length - 1]) > EPS) res.push(pts[i]);
    }
    return res;
}

function drawClosedPolyline(pts, r, g, b, a, closed = true) {
    if (pts.length < 2) return;

    for (let i = 0; i < pts.length - 1; ++i) {
        dlineFunc(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r, g, b, a);
    }

    if (closed && pts.length >= 3) {
        const p1 = pts[pts.length - 1];
        const p2 = pts[0];
        dlineFunc(p1[0], p1[1], p2[0], p2[1], r, g, b, a);
    }
}