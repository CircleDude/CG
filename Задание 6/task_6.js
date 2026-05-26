let loopON = true;
let lastTime = 0;
let M = [0, 0];
let Z_EPS = 0.05;

// const dlineFunc = drawLine;
const dLineFunc = drawSmoothLine;

const state = {
    shape: "cube",
    projection: "orthographic",
    focalLength: 200,
    useZBuffer: false,
    rot: {
        x: { enabled: false, speed: 0.0005, angle: 0 },
        y: { enabled: false, speed: 0.0005, angle: 0 },
        z: { enabled: false, speed: 0.0005, angle: 0 }
    }
};

let mesh = null;
let zBuffer = [];

document.addEventListener("DOMContentLoaded", function () {
    setCurrentCanvas("myCanvas");

    canvas.width = 300;
    canvas.height = Math.floor(canvas.width / 1.5);
    updateCanvasImage();

    canvas.onmousemove = function (e) {
        M = getCanvasMousePoint(e);
    };

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") loopON = false;
    });

    bindControls();
    setShape(state.shape);

    d3.select("body").insert("div", "div").attr("id", "fps").node().innerHTML = "fps";

    loop();
});

function bindControls() {
    const shapeSelect = d3.select("#shape").node();
    const projectionSelect = d3.select("#projection").node();
    const focalInput = d3.select("#focalLength").node();
    const focalWrap = d3.select("#focalWrap").node();
    const zCheck = d3.select("#useZBuffer").node();

    const rotX = d3.select("#rotX").node();
    const rotY = d3.select("#rotY").node();
    const rotZ = d3.select("#rotZ").node();

    const speedX = d3.select("#speedX").node();
    const speedY = d3.select("#speedY").node();
    const speedZ = d3.select("#speedZ").node();

    shapeSelect.onchange = () => setShape(shapeSelect.value);

    projectionSelect.onchange = () => {
        state.projection = projectionSelect.value;
        focalWrap.style.display = (state.projection === "perspective") ? "" : "none";
    };

    focalInput.oninput = () => {
        state.focalLength = Math.max(50, Number(focalInput.value) || 500);
    };

    zCheck.onchange = () => {
        state.useZBuffer = zCheck.checked;
    };

    rotX.onchange = () => state.rot.x.enabled = rotX.checked;
    rotY.onchange = () => state.rot.y.enabled = rotY.checked;
    rotZ.onchange = () => state.rot.z.enabled = rotZ.checked;

    speedX.oninput = () => state.rot.x.speed = Number(speedX.value) || 0;
    speedY.oninput = () => state.rot.y.speed = Number(speedY.value) || 0;
    speedZ.oninput = () => state.rot.z.speed = Number(speedZ.value) || 0;

    projectionSelect.value = state.projection;
    focalInput.value = state.focalLength;
    zCheck.checked = state.useZBuffer;
    rotX.checked = state.rot.x.enabled;
    rotY.checked = state.rot.y.enabled;
    rotZ.checked = state.rot.z.enabled;

    const zEpsInput = d3.select("#zEps").node();

    zEpsInput.oninput = () => {
        Z_EPS = Math.max(0, Number(zEpsInput.value) || 0.001);
    };

    zEpsInput.value = Z_EPS;
}

function setShape(shapeName) {
    state.shape = shapeName;
    mesh = createMesh(shapeName);
}

const loop = function (time) {
    const dt = time - lastTime;
    lastTime = time;

    if (dt > 0) {
        d3.select("#fps").node().innerHTML = `fps: ${Math.floor(1000 / dt)}`;
    }

    updateScene(dt);
    renderScene();

    if (loopON) requestAnimationFrame(loop);
};

function updateScene(dt) {
    d3.select("#x").node().innerHTML = "x: " + M[0];
    d3.select("#y").node().innerHTML = "y: " + M[1];

    if (state.rot.x.enabled) state.rot.x.angle += state.rot.x.speed * (dt || 16.7);
    if (state.rot.y.enabled) state.rot.y.angle += state.rot.y.speed * (dt || 16.7);
    if (state.rot.z.enabled) state.rot.z.angle += state.rot.z.speed * (dt || 16.7);
}

function renderScene() {
    clearCanvas();
    initZBuffer();

    if (!mesh) return;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const scale = Math.min(canvas.width, canvas.height) * 0.28;
    const cameraDistance = 4.5;

    const rotated = rotate3D(
        0, 0, 0,
        state.rot.x.angle,
        state.rot.y.angle,
        state.rot.z.angle,
        ...mesh.vertices
    );

    const projected = rotated.map(v => projectPoint(v, cx, cy, scale, cameraDistance));

    if (state.useZBuffer && mesh.faces.length > 0) {
        // Сначала заполняем z-buffer по граням
        for (const face of mesh.faces) {
            for (let i = 1; i + 1 < face.length; ++i) {
                const a = projected[face[0]];
                const b = projected[face[i]];
                const c = projected[face[i + 1]];
                fillTriangleToZBuffer(a, b, c);
            }
        }
    }

    // Рёбра
    for (const [i0, i1] of mesh.edges) {
        const p0 = projected[i0];
        const p1 = projected[i1];

        if (state.useZBuffer) {
            drawLineZBuffered(p0, p1, 30, 30, 30, 1);
        } else {
            dLineFunc(
                p0.x, p0.y,
                p1.x, p1.y,
                30, 30, 30, 1
            );
        }
    }

    updateCanvasContext();
}

function initZBuffer() {
    zBuffer = new Array(canvas.width);
    for (let x = 0; x < canvas.width; ++x) {
        zBuffer[x] = new Array(canvas.height).fill(Infinity);
    }
}

function projectPoint(p, cx, cy, scale, cameraDistance) {
    const z = p[2] + cameraDistance;
    const safeZ = Math.max(0.001, z);

    if (state.projection === "perspective") {
        const k = state.focalLength / safeZ;
        return {
            x: cx + p[0] * k,
            y: cy - p[1] * k,
            z: safeZ
        };
    }

    return {
        x: cx + p[0] * scale,
        y: cy - p[1] * scale,
        z: safeZ
    };
}

function drawLineZBuffered(p0, p1, r, g, b, a) {
    const x0 = Math.round(p0.x);
    const y0 = Math.round(p0.y);
    const x1 = Math.round(p1.x);
    const y1 = Math.round(p1.y);

    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    if (steps === 0) {
        plotZ(x0, y0, p0.z, r, g, b, a);
        return;
    }

    for (let i = 0; i <= steps; ++i) {
        const t = i / steps;
        const x = Math.round(x0 + dx * t);
        const y = Math.round(y0 + dy * t);
        const z = p0.z + (p1.z - p0.z) * t - Z_EPS;
        plotZ(x, y, z, r, g, b, a);
    }
}

function plotZ(x, y, z, r, g, b, a) {
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return;

    if (z <= zBuffer[x][y] + Z_EPS) {
        zBuffer[x][y] = z;
        drawPixel(x, y, r, g, b, a);
    }
}

function fillTriangleToZBuffer(a, b, c) {
    const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
    const maxX = Math.min(canvas.width - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
    const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
    const maxY = Math.min(canvas.height - 1, Math.ceil(Math.max(a.y, b.y, c.y)));

    const area = edge(a.x, a.y, b.x, b.y, c.x, c.y);
    if (Math.abs(area) < 1e-8) return;

    for (let y = minY; y <= maxY; ++y) {
        for (let x = minX; x <= maxX; ++x) {
            const px = x + 0.5;
            const py = y + 0.5;

            const w0 = edge(b.x, b.y, c.x, c.y, px, py);
            const w1 = edge(c.x, c.y, a.x, a.y, px, py);
            const w2 = edge(a.x, a.y, b.x, b.y, px, py);

            const inside = (area > 0)
                ? (w0 >= 0 && w1 >= 0 && w2 >= 0)
                : (w0 <= 0 && w1 <= 0 && w2 <= 0);

            if (!inside) continue;

            const l0 = w0 / area;
            const l1 = w1 / area;
            const l2 = w2 / area;
            const z = l0 * a.z + l1 * b.z + l2 * c.z;

            if (z < zBuffer[x][y]) zBuffer[x][y] = z;
        }
    }
}

function edge(ax, ay, bx, by, px, py) {
    return (px - ax) * (by - ay) - (py - ay) * (bx - ax);
}

function createMesh(type) {
    switch (type) {
        case "octahedron": return createOctahedron();
        case "pyramid": return createPyramid();
        case "cylinder": return createCylinder(18);
        case "cone": return createCone(18);
        case "sphere": return createSphere(12, 24);
        case "torus": return createTorus(14, 24);
        case "cube":
        default: return createCube();
    }
}

function createCube() {
    const v = [
        [-1, -1, -1], [ 1, -1, -1], [ 1,  1, -1], [-1,  1, -1],
        [-1, -1,  1], [ 1, -1,  1], [ 1,  1,  1], [-1,  1,  1]
    ];

    const faces = [
        [0, 1, 2, 3], [4, 5, 6, 7],
        [0, 1, 5, 4], [1, 2, 6, 5],
        [2, 3, 7, 6], [3, 0, 4, 7]
    ];

    return { vertices: v, faces, edges: facesToEdges(faces) };
}

function createOctahedron() {
    const v = [
        [0, 0, 1.4], [0, 0, -1.4],
        [-1.2, 0, 0], [1.2, 0, 0],
        [0, -1.2, 0], [0, 1.2, 0]
    ];

    const faces = [
        [0, 3, 5], [0, 5, 2], [0, 2, 4], [0, 4, 3],
        [1, 5, 3], [1, 2, 5], [1, 4, 2], [1, 3, 4]
    ];

    return { vertices: v, faces, edges: facesToEdges(faces) };
}

function createPyramid() {
    const v = [
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [0, 0, 1.4]
    ];

    const faces = [
        [0, 1, 2, 3],
        [0, 1, 4],
        [1, 2, 4],
        [2, 3, 4],
        [3, 0, 4]
    ];

    return { vertices: v, faces, edges: facesToEdges(faces) };
}

function createCylinder(segments = 18) {
    const vertices = [];
    const faces = [];

    for (let i = 0; i < segments; ++i) {
        const t = (i / segments) * Math.PI * 2;
        const x = Math.cos(t);
        const y = Math.sin(t);

        vertices.push([x, y, 1]);   // top
        vertices.push([x, y, -1]);  // bottom
    }

    const topCenter = vertices.push([0, 0, 1]) - 1;
    const bottomCenter = vertices.push([0, 0, -1]) - 1;

    for (let i = 0; i < segments; ++i) {
        const i0 = i * 2;
        const i1 = ((i + 1) % segments) * 2;

        faces.push([i0, i1, i1 + 1, i0 + 1]); // side
        faces.push([topCenter, i1, i0]);      // top cap
        faces.push([bottomCenter, i0 + 1, i1 + 1]); // bottom cap
    }

    return { vertices, faces, edges: facesToEdges(faces) };
}

function createCone(segments = 18) {
    const vertices = [];
    const faces = [];

    for (let i = 0; i < segments; ++i) {
        const t = (i / segments) * Math.PI * 2;
        const x = Math.cos(t);
        const y = Math.sin(t);
        vertices.push([x, y, -1]);
    }

    const apex = vertices.push([0, 0, 1.5]) - 1;
    const center = vertices.push([0, 0, -1]) - 1;

    for (let i = 0; i < segments; ++i) {
        const i0 = i;
        const i1 = (i + 1) % segments;
        faces.push([i0, i1, apex]);
        faces.push([center, i1, i0]);
    }

    return { vertices, faces, edges: facesToEdges(faces) };
}

function createSphere(latSeg = 12, lonSeg = 24) {
    const vertices = [];
    const faces = [];
    const idx = (i, j) => i * (lonSeg + 1) + j;

    for (let i = 0; i <= latSeg; ++i) {
        const v = i / latSeg;
        const phi = v * Math.PI;
        const y = Math.cos(phi);
        const r = Math.sin(phi);

        for (let j = 0; j <= lonSeg; ++j) {
            const u = j / lonSeg;
            const theta = u * Math.PI * 2;
            const x = r * Math.cos(theta);
            const z = r * Math.sin(theta);
            vertices.push([x, y, z]);
        }
    }

    for (let i = 0; i < latSeg; ++i) {
        for (let j = 0; j < lonSeg; ++j) {
            faces.push([
                idx(i, j),
                idx(i, j + 1),
                idx(i + 1, j + 1),
                idx(i + 1, j)
            ]);
        }
    }

    return { vertices, faces, edges: facesToEdges(faces) };
}

function createTorus(radSeg = 14, tubeSeg = 24) {
    const vertices = [];
    const faces = [];
    const R = 1.2;
    const r = 0.45;
    const idx = (i, j) => i * (tubeSeg + 1) + j;

    for (let i = 0; i <= radSeg; ++i) {
        const u = (i / radSeg) * Math.PI * 2;
        const cu = Math.cos(u);
        const su = Math.sin(u);

        for (let j = 0; j <= tubeSeg; ++j) {
            const v = (j / tubeSeg) * Math.PI * 2;
            const cv = Math.cos(v);
            const sv = Math.sin(v);

            const x = (R + r * cv) * cu;
            const y = (R + r * cv) * su;
            const z = r * sv;
            vertices.push([x, y, z]);
        }
    }

    for (let i = 0; i < radSeg; ++i) {
        for (let j = 0; j < tubeSeg; ++j) {
            faces.push([
                idx(i, j),
                idx(i + 1, j),
                idx(i + 1, j + 1),
                idx(i, j + 1)
            ]);
        }
    }

    return { vertices, faces, edges: facesToEdges(faces) };
}

function facesToEdges(faces) {
    const set = new Set();
    const edges = [];

    for (const face of faces) {
        for (let i = 0; i < face.length; ++i) {
            const a = face[i];
            const b = face[(i + 1) % face.length];
            const key = a < b ? `${a}-${b}` : `${b}-${a}`;
            if (!set.has(key)) {
                set.add(key);
                edges.push([a, b]);
            }
        }
    }

    return edges;
}


function rotate3D(cx, cy, cz, ax, ay, az, ...points) {
    const Rx =
        [[1, 0, 0, 0],
         [0, Math.cos(ax), Math.sin(ax), 0],
         [0, -Math.sin(ax), Math.cos(ax), 0],
         [0, 0, 0, 1]];

    const Ry =
        [[Math.cos(ay), 0, -Math.sin(ay), 0],
         [0, 1, 0, 0],
         [Math.sin(ay), 0, Math.cos(ay), 0],
         [0, 0, 0, 1]];

    const Rz =
        [[Math.cos(az), Math.sin(az), 0, 0],
         [-Math.sin(az), Math.cos(az), 0, 0],
         [0, 0, 1, 0],
         [0, 0, 0, 1]];

    const N0 =
        [[1, 0, 0, 0],
         [0, 1, 0, 0],
         [0, 0, 1, 0],
         [-cx, -cy, -cz, 1]];

    const N1 =
        [[1, 0, 0, 0],
         [0, 1, 0, 0],
         [0, 0, 1, 0],
         [cx, cy, cz, 1]];

    return points.map(p => {
        const res = math.multiply([p[0], p[1], p[2], 1], N0, Rx, Ry, Rz, N1);
        return [res[0], res[1], res[2]];
    });
}