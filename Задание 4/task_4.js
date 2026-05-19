let loopON = true;

let points = [];
let M = [0, 0];
let currentMode = 0; // 0 — выпуклый, 1 — звездчатый, 2 — сложный

const dlineFunc = drawLine;
// const dlineFunc = drawSmoothLine;

document.addEventListener("DOMContentLoaded", function () {
    setCurrentCanvas("myCanvas");

    canvas.width = 300;
    canvas.height = Math.floor(canvas.width / 1.5);
    updateCanvasImage();

    canvas.onmousemove = function (e) {
        M = getCanvasMousePoint(e);
    };

    canvas.onmousedown = function (e) {
        if (e.button === 0) {
            points.push([...getCanvasMousePoint(e)]);
        }
        if (e.button === 2) {
            points = [];
        }
    };

    canvas.oncontextmenu = function (e) {
        e.preventDefault();
        points = [];
        return false;
    };

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") points = [];
    });

    d3.select("body").insert("div", "div").attr("id", "fps").node().innerHTML = "fps";

    const modeSelect = d3.select("#mode").node();
    if (modeSelect) {
        currentMode = modeSelect.selectedIndex; // 0,1,2
        modeSelect.onchange = function () {
            currentMode = modeSelect.selectedIndex;
        };
    }

    loop();
});

let lastTime = 0;

const loop = function (time) {
    const dt = time - lastTime;
    lastTime = time;

    if (dt > 0) {
        d3.select("#fps").node().innerHTML = `fps: ${Math.floor(1000 / dt)}`;
    }

    dataUpdateItaration(dt);
    canvasUpdateIteration();

    if (loopON) requestAnimationFrame(loop);
};

const dataUpdateItaration = function (dt) {
    d3.select("#x").node().innerHTML = "x: " + M[0];
    d3.select("#y").node().innerHTML = "y: " + M[1];
};

const canvasUpdateIteration = function () {
    clearCanvas();

    for (const p of points) {
        drawPixel(p[0], p[1], 0, 0, 255, 1);
    }

    if (points.length >= 1) {
        const last = points[points.length - 1];
        dlineFunc(last[0], last[1], M[0], M[1], 180, 180, 180, 1);
    }

    if (points.length >= 3) {
        drawFilledPolygon(points, currentMode);
    } else if (points.length >= 2) {
        drawClosedPolyline(points, 220, 20, 20, 1, false);
    }

    drawPixel(M[0], M[1], 0, 255, 0, 1);

    updateCanvasContext();
};



function drawFilledPolygon(srcPoints, mode) {
    const pts = preparePolygon(srcPoints, mode);

    if (pts.length < 3) return;

    const simple = isSimplePolygon(pts);

    fillPolygonEvenOdd(pts, 60, 140, 255, 0.65);

    const stroke = simple ? [220, 20, 20, 1] : [255, 140, 0, 1];
    drawClosedPolyline(pts, ...stroke, true);

    for (const p of pts) {
        drawPixel(p[0], p[1], 0, 0, 0, 1);
    }
}

// mode:
// 0 — выпуклый/упорядоченный по углу
// 1 — звездчатый
// 2 — сложный самопересекающийся (как кликнули)
function preparePolygon(srcPoints, mode) {
    const pts = srcPoints.map(p => [Math.round(p[0]), Math.round(p[1])]);

    if (pts.length < 3) return pts;

    if (mode === 0) {
        // выпуклый/простая фигура: сортируем по углу относительно центра
        return sortByAngle(pts);
    }

    if (mode === 1) {
        // звездчатая: сначала по углу, потом чередуем точки
        const sorted = sortByAngle(pts);
        return makeStarOrder(sorted);
    }

    // mode === 2
    // сложный полигон — оставляем порядок кликов
    return pts.slice();
}

function sortByAngle(pts) {
    const c = centroid(pts);
    return [...pts].sort((a, b) => {
        const aa = Math.atan2(a[1] - c[1], a[0] - c[0]);
        const bb = Math.atan2(b[1] - c[1], b[0] - c[0]);
        return aa - bb;
    });
}

function centroid(pts) {
    let sx = 0, sy = 0;
    for (const p of pts) {
        sx += p[0];
        sy += p[1];
    }
    return [sx / pts.length, sy / pts.length];
}

function makeStarOrder(sortedPts) {
    const even = [];
    const odd = [];

    for (let i = 0; i < sortedPts.length; ++i) {
        if (i % 2 === 0) even.push(sortedPts[i]);
        else odd.push(sortedPts[i]);
    }

    // сначала внешние, потом внутренние в обратном порядке
    return even.concat(odd.reverse());
}



function fillPolygonEvenOdd(pts, r, g, b, a) {
    if (pts.length < 3) return;

    let minY = canvas.height;
    let maxY = 0;

    for (const p of pts) {
        minY = Math.min(minY, p[1]);
        maxY = Math.max(maxY, p[1]);
    }

    minY = Math.max(0, Math.floor(minY));
    maxY = Math.min(canvas.height - 1, Math.ceil(maxY));

    for (let y = minY; y <= maxY; ++y) {
        const scanY = y + 0.5;
        const xs = [];

        for (let i = 0; i < pts.length; ++i) {
            const p1 = pts[i];
            const p2 = pts[(i + 1) % pts.length];

            // горизонтальные ребра пропускаем
            if (p1[1] === p2[1]) continue;

            const ymin = Math.min(p1[1], p2[1]);
            const ymax = Math.max(p1[1], p2[1]);

            if (scanY < ymin || scanY >= ymax) continue;

            const x = p1[0] + (scanY - p1[1]) * (p2[0] - p1[0]) / (p2[1] - p1[1]);
            xs.push(x);
        }

        xs.sort((a, b) => a - b);

        for (let i = 0; i + 1 < xs.length; i += 2) {
            let x1 = Math.ceil(xs[i]);
            let x2 = Math.floor(xs[i + 1]);

            if (x2 < x1) continue;

            x1 = Math.max(0, x1);
            x2 = Math.min(canvas.width - 1, x2);

            for (let x = x1; x <= x2; ++x) {
                drawPixel(x, y, r, g, b, a);
            }
        }
    }
}



function isSimplePolygon(pts) {
    if (pts.length < 4) return true;

    for (let i = 0; i < pts.length; ++i) {
        const a1 = pts[i];
        const a2 = pts[(i + 1) % pts.length];

        for (let j = i + 1; j < pts.length; ++j) {
            // соседние ребра не проверяем
            if (Math.abs(i - j) <= 1) continue;
            if (i === 0 && j === pts.length - 1) continue;

            const b1 = pts[j];
            const b2 = pts[(j + 1) % pts.length];

            if (segmentsIntersect(a1, a2, b1, b2)) {
                return false;
            }
        }
    }

    return true;
}

function segmentsIntersect(p1, p2, p3, p4) {
    const o1 = orient(p1, p2, p3);
    const o2 = orient(p1, p2, p4);
    const o3 = orient(p3, p4, p1);
    const o4 = orient(p3, p4, p2);

    return (o1 * o2 < 0) && (o3 * o4 < 0);
}

function orient(a, b, c) {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
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
