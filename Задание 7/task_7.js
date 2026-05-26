let loopON = true;
let lastTime = 0;
let M = [0, 0];

const state = {
    shadeMode: "gouraud",   // gouraud | phong
    useAmbient: true,
    useSpecular: false,
    useShadows: true,
    shininess: 28,
    sphereDetail: 10,
    torusDetail: 12,
    time: 0
};

const camera = {
    position: [0, 0, 8.0],
    focalLength: 260
};

const planeY = -1.75;
const plane = [0, 1, 0, -planeY]; // y - planeY = 0 => y + 1.75 = 0

const ambientStrength = 0.4;
const specularStrength = 0.65;

const lights = [
    {
        enabled: true,
        position: [-3.5, 3.8, 4.5],
        color: [255, 80, 80],   // красный
        intensity: 1.0
    },
    {
        enabled: true,
        position: [3.5, 2.6, 2.8],
        color: [80, 160, 255],  // голубой
        intensity: 0.95
    }
];

let sphereMesh = null;
let torusMesh = null;
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
    rebuildMeshes();

    d3.select("body").insert("div", "div")
        .attr("id", "fps")
        .node().innerHTML = "fps";

    loop();
});

function bindControls() {
    const sphereDetail = d3.select("#sphereDetail").node();
    const torusDetail = d3.select("#torusDetail").node();

    const useAmbient = d3.select("#useAmbient").node();
    const useSpecular = d3.select("#useSpecular").node();
    const useShadows = d3.select("#useShadows").node();
    const shininess = d3.select("#shininess").node();

    const light1Enabled = d3.select("#light1Enabled").node();
    const light2Enabled = d3.select("#light2Enabled").node();

    const shadeRadios = document.querySelectorAll('input[name="shadeMode"]');

    sphereDetail.oninput = () => {
        state.sphereDetail = clampInt(Number(sphereDetail.value), 4, 64, 10);
        rebuildMeshes();
    };

    torusDetail.oninput = () => {
        state.torusDetail = clampInt(Number(torusDetail.value), 4, 64, 12);
        rebuildMeshes();
    };

    useAmbient.onchange = () => state.useAmbient = useAmbient.checked;
    useSpecular.onchange = () => state.useSpecular = useSpecular.checked;
    useShadows.onchange = () => state.useShadows = useShadows.checked;
    shininess.oninput = () => state.shininess = clampInt(Number(shininess.value), 1, 200, 28);

    light1Enabled.onchange = () => lights[0].enabled = light1Enabled.checked;
    light2Enabled.onchange = () => lights[1].enabled = light2Enabled.checked;

    shadeRadios.forEach(r => {
        r.onchange = () => {
            const checked = document.querySelector('input[name="shadeMode"]:checked');
            state.shadeMode = checked ? checked.value : "gouraud";
            useSpecular.disabled = (state.shadeMode !== "phong");
            if (state.shadeMode !== "phong") state.useSpecular = false;
            useSpecular.checked = state.useSpecular;
        };
    });

    sphereDetail.value = state.sphereDetail;
    torusDetail.value = state.torusDetail;
    useAmbient.checked = state.useAmbient;
    useSpecular.checked = state.useSpecular;
    useShadows.checked = state.useShadows;
    shininess.value = state.shininess;
    light1Enabled.checked = lights[0].enabled;
    light2Enabled.checked = lights[1].enabled;
    useSpecular.disabled = true;
}

function clampInt(v, min, max, fallback) {
    if (!Number.isFinite(v)) return fallback;
    return Math.max(min, Math.min(max, Math.round(v)));
}

function rebuildMeshes() {
    sphereMesh = createSphereMesh(state.sphereDetail);
    torusMesh = createTorusMesh(state.torusDetail);
}

const loop = function (time) {
    const dt = time - lastTime;
    lastTime = time;

    if (dt > 0) {
        d3.select("#fps").node().innerHTML = `fps: ${Math.floor(1000 / dt)}`;
    }

    updateScene(dt || 16.7);
    renderScene();

    if (loopON) requestAnimationFrame(loop);
};

function updateScene(dt) {
    d3.select("#x").node().innerHTML = "x: " + M[0];
    d3.select("#y").node().innerHTML = "y: " + M[1];

    state.time += dt;

    const t = state.time * 0.0004;

    if (sphereMesh) {
        sphereMesh.rotation.y = t;
        sphereMesh.rotation.x = t * 0.65;
    }
    if (torusMesh) {
        torusMesh.rotation.y = -t * 0.85;
        torusMesh.rotation.x = t * 0.45;
    }
}

function renderScene() {
    clearCanvas();
    initZBuffer();

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const scale = Math.min(canvas.width, canvas.height) * 0.18;

    drawBackgroundPlane(cx, cy, scale);

    if (state.useShadows) {
        drawSceneShadows(cx, cy, scale);
    }

    drawObject(sphereMesh, {
        position: [-2.0, 0.15, 0.0],
        baseColor: [85, 145, 255],
        cx, cy, scale
    });

    drawObject(torusMesh, {
        position: [2.05, 0.05, 0.0],
        baseColor: [245, 155, 70],
        cx, cy, scale
    });

    updateCanvasContext();
}

function drawBackgroundPlane(cx, cy, scale) {
    const planeMesh = {
        vertices: [
            [-6, planeY, -6],
            [ 6, planeY, -6],
            [ 6, planeY,  6],
            [-6, planeY,  6]
        ],
        normals: [
            [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0]
        ],
        faces: [[0, 1, 2, 3]],
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1,
        baseColor: [225, 225, 225]
    };

    rasterizeMesh(planeMesh, {
        position: [0, 0, 0],
        baseColor: [225, 225, 225],
        cx, cy, scale,
        forceFlat: true,
        ignoreLighting: true
    });
}

function drawSceneShadows(cx, cy, scale) {
    for (const light of lights) {
        if (!light.enabled) continue;

        const shadowColor = [40, 40, 40];
        const alpha = 0.22;

        drawShadowMesh(sphereMesh, light, {
            position: [-2.0, 0.15, 0.0],
            cx, cy, scale,
            shadowColor,
            alpha
        });

        drawShadowMesh(torusMesh, light, {
            position: [2.05, 0.05, 0.0],
            cx, cy, scale,
            shadowColor,
            alpha
        });
    }
}

function drawObject(mesh, cfg) {
    if (!mesh) return;

    rasterizeMesh(mesh, {
        position: cfg.position,
        baseColor: cfg.baseColor,
        cx: cfg.cx,
        cy: cfg.cy,
        scale: cfg.scale,
        ignoreLighting: false
    });
}

function drawShadowMesh(mesh, light, cfg) {
    const shadowVerts = mesh.vertices.map(v => {
        const world = objectToWorld(v, cfg.position, mesh.scale, mesh.rotation);
        return projectPointToPlaneByLight(world, light.position, plane);
    });

    const projected = shadowVerts.map(p => projectToScreen(p, cfg.cx, cfg.cy, cfg.scale));

    for (const face of mesh.faces) {
        for (let i = 1; i + 1 < face.length; ++i) {
            const a = projected[face[0]];
            const b = projected[face[i]];
            const c = projected[face[i + 1]];

            rasterizeTriangle(a, b, c, {
                mode: "flat",
                baseColor: cfg.shadowColor,
                alpha: cfg.alpha,
                depthBias: -0.001,
                ignoreLighting: true
            });
        }
    }
}

function rasterizeMesh(mesh, cfg) {
    const transformedVertices = mesh.vertices.map((v, i) => {
        return objectToWorld(v, cfg.position, mesh.scale, mesh.rotation);
    });

    const transformedNormals = mesh.normals.map((n, i) => {
        return rotateVector(n, mesh.rotation);
    });

    const projected = transformedVertices.map(p => projectToScreen(p, cfg.cx, cfg.cy, cfg.scale));

    for (const face of mesh.faces) {
        for (let i = 1; i + 1 < face.length; ++i) {
            const i0 = face[0];
            const i1 = face[i];
            const i2 = face[i + 1];

            const p0 = projected[i0];
            const p1 = projected[i1];
            const p2 = projected[i2];

            const w0 = transformedVertices[i0];
            const w1 = transformedVertices[i1];
            const w2 = transformedVertices[i2];

            const n0 = transformedNormals[i0];
            const n1 = transformedNormals[i1];
            const n2 = transformedNormals[i2];

            if (isBackFace(w0, w1, w2)) continue;

            rasterizeTriangle(
                { ...p0, world: w0, normal: n0 },
                { ...p1, world: w1, normal: n1 },
                { ...p2, world: w2, normal: n2 },
                {
                    mode: state.shadeMode,
                    baseColor: cfg.baseColor,
                    alpha: 1,
                    depthBias: 0,
                    ignoreLighting: cfg.ignoreLighting === true
                }
            );
        }
    }
}

function rasterizeTriangle(a, b, c, opts) {
    if (!a || !b || !c) return;
    if (!Number.isFinite(a.x) || !Number.isFinite(a.y) ||
        !Number.isFinite(b.x) || !Number.isFinite(b.y) ||
        !Number.isFinite(c.x) || !Number.isFinite(c.y)) {
        return;
    }

    const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
    const maxX = Math.min(canvas.width - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
    const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
    const maxY = Math.min(canvas.height - 1, Math.ceil(Math.max(a.y, b.y, c.y)));

    const area = edge(a.x, a.y, b.x, b.y, c.x, c.y);
    if (Math.abs(area) < 1e-8) return;

    const invZa = 1 / Math.max(1e-8, a.depth ?? 1);
    const invZb = 1 / Math.max(1e-8, b.depth ?? 1);
    const invZc = 1 / Math.max(1e-8, c.depth ?? 1);

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

            let l0 = w0 / area;
            let l1 = w1 / area;
            let l2 = w2 / area;

            const invZ = l0 * invZa + l1 * invZb + l2 * invZc;
            if (invZ <= 0) continue;

            l0 = (l0 * invZa) / invZ;
            l1 = (l1 * invZb) / invZ;
            l2 = (l2 * invZc) / invZ;

            const depth = 1 / invZ + (opts.depthBias || 0);

            if (!zBuffer[x]) continue;
            if (depth >= zBuffer[x][y]) continue;

            zBuffer[x][y] = depth;

            let color;

            if (opts.ignoreLighting) {
                color = opts.baseColor || [220, 220, 220];
            } else if (opts.mode === "gouraud") {
                const c0 = shadePoint(a.world, a.normal, opts.baseColor, false);
                const c1 = shadePoint(b.world, b.normal, opts.baseColor, false);
                const c2 = shadePoint(c.world, c.normal, opts.baseColor, false);

                color = [
                    l0 * c0[0] + l1 * c1[0] + l2 * c2[0],
                    l0 * c0[1] + l1 * c1[1] + l2 * c2[1],
                    l0 * c0[2] + l1 * c1[2] + l2 * c2[2]
                ];
            } else {
                const world = [
                    l0 * a.world[0] + l1 * b.world[0] + l2 * c.world[0],
                    l0 * a.world[1] + l1 * b.world[1] + l2 * c.world[1],
                    l0 * a.world[2] + l1 * b.world[2] + l2 * c.world[2]
                ];

                const normal = normalize([
                    l0 * a.normal[0] + l1 * b.normal[0] + l2 * c.normal[0],
                    l0 * a.normal[1] + l1 * b.normal[1] + l2 * c.normal[1],
                    l0 * a.normal[2] + l1 * b.normal[2] + l2 * c.normal[2]
                ]);

                color = shadePoint(world, normal, opts.baseColor, true);
            }

            drawPixel(x, y, clamp255(color[0]), clamp255(color[1]), clamp255(color[2]), opts.alpha ?? 1);
        }
    }
}

function shadePoint(worldPos, normal, baseColor, allowSpecular) {
    const N = normalize(normal);
    const V = normalize([
        camera.position[0] - worldPos[0],
        camera.position[1] - worldPos[1],
        camera.position[2] - worldPos[2]
    ]);

    let r = 0;
    let g = 0;
    let b = 0;

    if (state.useAmbient) {
        r += baseColor[0] * ambientStrength;
        g += baseColor[1] * ambientStrength;
        b += baseColor[2] * ambientStrength;
    }

    for (const light of lights) {
        if (!light.enabled) continue;

        const L = normalize([
            light.position[0] - worldPos[0],
            light.position[1] - worldPos[1],
            light.position[2] - worldPos[2]
        ]);

        const ndotl = Math.max(0, dot(N, L));

        const lightColor = light.color;
        const diffuseScale = ndotl * light.intensity;

        r += (baseColor[0] * lightColor[0] / 255) * diffuseScale;
        g += (baseColor[1] * lightColor[1] / 255) * diffuseScale;
        b += (baseColor[2] * lightColor[2] / 255) * diffuseScale;

        if (allowSpecular && state.useSpecular) {
            const R = reflectVec(negateVec(L), N);
            const spec = Math.pow(Math.max(0, dot(normalize(R), V)), state.shininess) * specularStrength * light.intensity;

            r += lightColor[0] * spec;
            g += lightColor[1] * spec;
            b += lightColor[2] * spec;
        }
    }

    return [r, g, b];
}

function isBackFace(a, b, c) {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = cross(ab, ac);
    const view = [
        camera.position[0] - a[0],
        camera.position[1] - a[1],
        camera.position[2] - a[2]
    ];
    return dot(n, view) <= 0;
}

function projectToScreen(p, cx, cy, scale) {
    const depth = Math.max(0.2, camera.position[2] - p[2]);
    const k = camera.focalLength / depth;
    return {
        x: cx + p[0] * k,
        y: cy - p[1] * k,
        depth
    };
}

function objectToWorld(v, position, scale, rotation) {
    const p = [v[0] * scale, v[1] * scale, v[2] * scale];
    const r = rotateVector(p, rotation);
    return [
        r[0] + position[0],
        r[1] + position[1],
        r[2] + position[2]
    ];
}

function rotateVector(v, rot) {
    let x = v[0];
    let y = v[1];
    let z = v[2];

    const cx = Math.cos(rot.x || 0);
    const sx = Math.sin(rot.x || 0);
    const cy = Math.cos(rot.y || 0);
    const sy = Math.sin(rot.y || 0);
    const cz = Math.cos(rot.z || 0);
    const sz = Math.sin(rot.z || 0);

    let y1 = y * cx - z * sx;
    let z1 = y * sx + z * cx;
    y = y1;
    z = z1;

    let x2 = x * cy + z * sy;
    let z2 = -x * sy + z * cy;
    x = x2;
    z = z2;

    let x3 = x * cz - y * sz;
    let y3 = x * sz + y * cz;

    return [x3, y3, z];
}

function projectPointToPlaneByLight(point, lightPos, planeEq) {
    const [a, b, c, d] = planeEq;
    const lx = lightPos[0];
    const ly = lightPos[1];
    const lz = lightPos[2];

    const px = point[0];
    const py = point[1];
    const pz = point[2];

    const num = a * px + b * py + c * pz + d;
    const den = a * (px - lx) + b * (py - ly) + c * (pz - lz);

    if (Math.abs(den) < 1e-8) {
        return [px, planeY + 0.001, pz];
    }

    const t = num / den;
    return [
        px - t * (px - lx),
        py - t * (py - ly),
        pz - t * (pz - lz)
    ];
}

function createSphereMesh(detail) {
    const latSeg = clampInt(detail, 4, 64, 10);
    const lonSeg = latSeg * 2;

    const vertices = [];
    const normals = [];
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
            normals.push(normalize([x, y, z]));
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

    return {
        vertices,
        normals,
        faces,
        scale: 1.0,
        rotation: { x: 0, y: 0, z: 0 }
    };
}

function createTorusMesh(detail) {
    const radSeg = clampInt(detail, 4, 64, 12);
    const tubeSeg = radSeg * 2;

    const R = 1.25;
    const r = 0.48;

    const vertices = [];
    const normals = [];
    const faces = [];

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

            const nx = cv * cu;
            const ny = cv * su;
            const nz = sv;
            normals.push(normalize([nx, ny, nz]));
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

    return {
        vertices,
        normals,
        faces,
        scale: 0.95,
        rotation: { x: 0, y: 0, z: 0 }
    };
}

function initZBuffer() {
    zBuffer = new Array(canvas.width);
    for (let x = 0; x < canvas.width; ++x) {
        zBuffer[x] = new Array(canvas.height).fill(Infinity);
    }
}

function edge(ax, ay, bx, by, px, py) {
    return (px - ax) * (by - ay) - (py - ay) * (bx - ax);
}

function clamp255(v) {
    return Math.max(0, Math.min(255, Math.round(v)));
}

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a, b) {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ];
}

function length(v) {
    return Math.sqrt(dot(v, v));
}

function normalize(v) {
    const len = length(v);
    if (len < 1e-8) return [0, 0, 0];
    return [v[0] / len, v[1] / len, v[2] / len];
}

function negateVec(v) {
    return [-v[0], -v[1], -v[2]];
}

function reflectVec(I, N) {
    const k = 2 * dot(N, I);
    return [
        I[0] - k * N[0],
        I[1] - k * N[1],
        I[2] - k * N[2]
    ];
}