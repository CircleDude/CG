let loopON = false;

let M = [];
let TreeRects = [];
let LSystemSegments = [];
let LSystemLeaves = [];

let drawToken = 0;
let pendingTimers = [];

const dlineFunc = drawSmoothLine;

const MIN_SQUARE_SIDE = 3;
const MAX_DELAY = 240;
const MIN_DELAY = 18;

let modeSelect;
let angleWrap;
let angleInput;
let lsysWrap;
let lsysSelect;
let lsysIterWrap;
let lsysIterInput;

const L_SYSTEMS = {
    bush: {
        axiom: "X",
        rules: {
            X: "F+[[X]-X]-F[-FX]+X",
            F: "FF"
        },
        iterations: 5,
        baseLength: 9,
        scale: 0.73,
        turnDeg: 23
    },
    fern: {
        axiom: "F",
        rules: {
            F: "FF-[-F+F+F]+[+F-F-F]"
        },
        iterations: 4,
        baseLength: 13,
        scale: 0.78,
        turnDeg: 25
    }
};

document.addEventListener("DOMContentLoaded", () => {
    setCurrentCanvas("myCanvas");

    canvas.width = 1000;
    canvas.height = canvas.width / 1.5;

    updateCanvasImage();

    d3.select("body")
        .insert("div", "div")
        .attr("id", "fps")
        .node().innerHTML = "fps";

    modeSelect = document.querySelector("#mode");
    angleWrap = document.querySelector("#angleWrap");
    angleInput = document.querySelector("#angleInput");
    lsysWrap = document.querySelector("#lsysWrap");
    lsysSelect = document.querySelector("#lsysSelect");
    lsysIterWrap = document.querySelector("#lsysIterWrap");
    lsysIterInput = document.querySelector("#lsysIterInput");

    if (!modeSelect.value) modeSelect.value = "1";
    if (!angleInput.value) angleInput.value = "45";
    if (!lsysSelect.value) lsysSelect.value = "bush";
    if (!lsysIterInput.value) lsysIterInput.value = "5";

    syncModeUI();
    modeSelect.addEventListener("change", syncModeUI);

    canvas.onmousemove = (e) => {
        M = getCanvasMousePoint(e);
    };

    canvas.onclick = (e) => {
        stopCurrentDrawing();

        const [x, y] = getCanvasMousePoint(e);

        if (modeSelect.value === "3") {
            startLSystem(x, y, lsysSelect.value, getLSystemIterations());
            return;
        }

        const angle = getSelectedAngle();
        if (angle == null) return;

        TreeRects = [];
        LSystemSegments = [];
        LSystemLeaves = [];
        drawToken++;

        const size = Math.round(canvas.height / 20);
        const root = getSquarePointsCenter(x, y, size);

        TreeRects.push(root);

        scheduleBranch(root[0], root[1], root[2], angle, drawToken);
    };

    loopON = true;
    requestAnimationFrame(loop);
});

function syncModeUI() {
    angleWrap.style.display = modeSelect.value === "2" ? "block" : "none";
    lsysWrap.style.display = modeSelect.value === "3" ? "block" : "none";
    lsysIterWrap.style.display = modeSelect.value === "3" ? "block" : "none";
}

function getSelectedAngle() {
    if (modeSelect.value === "1") {
        return Math.PI / 4;
    }

    if (modeSelect.value === "2") {
        let deg = Number(angleInput.value);
        if (!Number.isFinite(deg)) deg = 45;

        deg = Math.max(1, Math.min(89, deg));
        angleInput.value = String(deg);

        return deg * Math.PI / 180;
    }

    return null;
}

function getLSystemIterations() {
    let it = Number(lsysIterInput.value);
    if (!Number.isFinite(it)) it = 5;

    it = Math.max(1, Math.min(10, Math.round(it)));
    lsysIterInput.value = String(it);

    return it;
}

function stopCurrentDrawing() {
    for (const t of pendingTimers) {
        clearTimeout(t);
    }
    pendingTimers = [];
}

let lastTime = 0;
function loop(time = 0) {
    const dt = time - lastTime;
    lastTime = time;

    const fps = dt > 0 ? Math.round(1000 / dt) : 0;
    d3.select("#fps").node().innerHTML = "fps: " + fps;

    dataUpdateIteration();
    canvasUpdateIteration();

    if (loopON) requestAnimationFrame(loop);
}

function dataUpdateIteration() {
    d3.select("#x").node().innerHTML = "x: " + M[0];
    d3.select("#y").node().innerHTML = "y: " + M[1];
}

function canvasUpdateIteration() {
    clearCanvas();

    drawRects(0, 0, 0, 1, ...TreeRects);
    drawSegments(0, 0, 0, 1, ...LSystemSegments);
    drawLeaves(0, 100, 0, 1, ...LSystemLeaves);

    if (M.length === 2) {
        drawPixel(...M, 0, 255, 0);
    }

    updateCanvasContext();
}

// Дерево Пифагора

function scheduleBranch(a, b, insidePoint, angle, token) {
    if (token !== drawToken) return;

    const side = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (side < MIN_SQUARE_SIDE) return;

    const delay = getDelayBySize(side);

    const timer = setTimeout(() => {
        growBranch(a, b, insidePoint, angle, token);
    }, delay);

    pendingTimers.push(timer);
}

function growBranch(a, b, insidePoint, angle, token) {
    if (token !== drawToken) return;

    const apex = makeApex(a, b, insidePoint, angle);

    const leftSquare = makeSquareOnEdge(a, apex, b);
    const rightSquare = makeSquareOnEdge(apex, b, a);

    TreeRects.push(leftSquare);
    TreeRects.push(rightSquare);

    scheduleBranch(
        leftSquare[3],
        leftSquare[2],
        midpoint(a, apex),
        angle,
        token
    );

    scheduleBranch(
        rightSquare[3],
        rightSquare[2],
        midpoint(apex, b),
        angle,
        token
    );
}

function getDelayBySize(side) {
    const delay = Math.round(side * 2.2);
    return Math.max(MIN_DELAY, Math.min(MAX_DELAY, delay));
}

function midpoint(p0, p1) {
    return [
        (p0[0] + p1[0]) / 2,
        (p0[1] + p1[1]) / 2
    ];
}

function cross(a, b, c) {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function chooseOuterNormal(a, b, insidePoint) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);

    if (len === 0) return [0, -1];

    const ux = dx / len;
    const uy = dy / len;

    return cross(a, b, insidePoint) > 0 ? [uy, -ux] : [-uy, ux];
}

function makeApex(a, b, insidePoint, angle) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);

    if (len === 0) return [...a];

    const ux = dx / len;
    const uy = dy / len;
    const n = chooseOuterNormal(a, b, insidePoint);

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const along = len * cos * cos;
    const perp = len * sin * cos;

    return [
        a[0] + ux * along + n[0] * perp,
        a[1] + uy * along + n[1] * perp
    ];
}

function makeSquareOnEdge(a, b, insidePoint) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);

    if (len === 0) {
        return [a, b, b, a];
    }

    const n = chooseOuterNormal(a, b, insidePoint);

    const c = [b[0] + n[0] * len, b[1] + n[1] * len];
    const d = [a[0] + n[0] * len, a[1] + n[1] * len];

    return [a, b, c, d];
}

function getSquarePointsCenter(x, y, r) {
    return [
        [x - r, y - r],
        [x + r, y - r],
        [x + r, y + r],
        [x - r, y + r]
    ];
}

// L-система

function startLSystem(x, y, presetName, iterations) {
    const preset = L_SYSTEMS[presetName] ?? L_SYSTEMS.bush;

    TreeRects = [];
    LSystemSegments = [];
    LSystemLeaves = [];
    drawToken++;

    const commands = buildLSystemString(
        preset.axiom,
        preset.rules,
        iterations
    );

    const state = {
        x,
        y,
        angle: -Math.PI / 2,
        stack: []
    };

    processLSystemCommand(0, state, commands, preset, drawToken);
}

function buildLSystemString(axiom, rules, iterations) {
    let current = axiom;

    for (let i = 0; i < iterations; i++) {
        let next = "";

        for (const ch of current) {
            next += rules[ch] ?? ch;
        }

        current = next;
    }

    return current;
}

function processLSystemCommand(index, state, commands, preset, token) {
    if (token !== drawToken) return;
    if (index >= commands.length) return;

    const ch = commands[index];
    const turn = preset.turnDeg * Math.PI / 180;

    let delay = MIN_DELAY;

    if (ch === "F") {
        const depth = state.stack.length;
        const len = preset.baseLength * Math.pow(preset.scale, depth);

        const x2 = state.x + Math.cos(state.angle) * len;
        const y2 = state.y + Math.sin(state.angle) * len;

        LSystemSegments.push([[state.x, state.y], [x2, y2]]);

        state.x = x2;
        state.y = y2;

        delay = getLSystemDelay(len);
    } else if (ch === "+") {
        state.angle += turn;
        delay = 8;
    } else if (ch === "-") {
        state.angle -= turn;
        delay = 8;
    } else if (ch === "[") {
        state.stack.push({
            x: state.x,
            y: state.y,
            angle: state.angle
        });
        delay = 2;
    } else if (ch === "]") {
        const leafSize = Math.max(2, Math.round(preset.baseLength * Math.pow(preset.scale, state.stack.length) * 0.14));
        LSystemLeaves.push([state.x, state.y, leafSize]);

        const prev = state.stack.pop();
        if (prev) {
            state.x = prev.x;
            state.y = prev.y;
            state.angle = prev.angle;
        }
        delay = 2;
    }

    const timer = setTimeout(() => {
        processLSystemCommand(index + 1, state, commands, preset, token);
    }, 0);

    pendingTimers.push(timer);
}

function getLSystemDelay(len) {
    return Math.max(MIN_DELAY, Math.min(MAX_DELAY, Math.round(len * 10)));
}

/* ---------------------------
   Drawing helpers
---------------------------- */

function drawRects(r, g, b, a, ...rects) {
    for (const rect of rects) {
        drawPolyLine(dlineFunc, true, r, g, b, a, ...rect);
    }
}

function drawSegments(r, g, b, a, ...segments) {
    for (const seg of segments) {
        drawSmoothLine(...seg[0], ...seg[1], r, g, b, a);
    }
}

function drawLeaves(r, g, b, a, ...leaves) {
    for (const leaf of leaves) {
        fillCircle(leaf[0], leaf[1], leaf[2], r, g, b, a);
    }
}

function fillCircle(cx, cy, radius, r, g, b, a = 1) {
    const rr = radius * radius;

    const minX = Math.floor(cx - radius);
    const maxX = Math.ceil(cx + radius);
    const minY = Math.floor(cy - radius);
    const maxY = Math.ceil(cy + radius);

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const dx = x - cx;
            const dy = y - cy;

            if (dx * dx + dy * dy <= rr) {
                drawPixel(x, y, r, g, b, a);
            }
        }
    }
}