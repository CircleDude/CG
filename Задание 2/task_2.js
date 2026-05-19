let loopON = false;
let M = [];
let Rect = [];
let Line = [];
let FigureRect = [];
let Rects = [];
const dlineFunc = drawLine;
// const dlineFunc = drawSmoothLine;
let modeProc = function() {};

document.addEventListener("DOMContentLoaded", function() {
    setCurrentCanvas('myCanvas');
    // canvas.width = 60;
    canvas.width = 300;
    canvas.height = canvas.width / 1.5;
    updateCanvasImage();

    canvas.onmousemove = function(e) {
        M =
            [Math.floor(e.offsetX / canvas.offsetWidth * canvas.width),
            Math.floor(e.offsetY / canvas.offsetHeight * canvas.height)];

        updateFigureRectByMouse();
    }
    
    canvas.onclick = function(e) {
        if (Line.length === 2) {
            Line = [];
        }
        Line.push(M);
    }

    Rect = [
        [canvas.width/4, canvas.height/4],
        [canvas.width/4*3, canvas.height/4],
        [canvas.width/4*3, canvas.height/4*3],
        [canvas.width/4, canvas.height/4*3]
    ];

    FigureRect = createRandomFigureRect();
    
    d3.select('body').insert('div', 'div').attr('id', 'fps').node().innerHTML = 'fps';

    loop();
    canvas.onmouseenter = function(e) {
        if (!loopON) {
            loopON = true;
            loop();
        }
    }
    canvas.onmouseleave = function(e) {
        loopON = false;
    }

    
    // modeProc = lineModeProc;
    modeProc = rectModeProc;
    d3.select('#mode').node().onchange = function(e) {
        switch (d3.select('#mode').node().value) {
            case 'line':
                modeProc = lineModeProc;
                break;
            case 'rect':
                modeProc = rectModeProc;
                break;
        }
    }
})


let lastTime = 0;
const loop = function(time) {
    const dt = time - lastTime;
    lastTime = time;

    d3.select('#fps').node().innerHTML = `fps: ${Math.floor(1 / dt * 1000)}`;

    dataUpdateItaration(dt);
    canvasUpdateIteration();
    
    if (loopON) requestAnimationFrame(loop);
}


const dataUpdateItaration = function(dt) {
    d3.select('#x').node().innerHTML = 'x: ' + M[0];
    d3.select('#y').node().innerHTML = 'y: ' + M[1];
}    

const canvasUpdateIteration = function() {
    clearCanvas();

    drawPolyLine(dlineFunc, true, 0,0,0,0.1, ...Rect);
    modeProc();
    
    updateCanvasContext();
}


const lineModeProc = function() {

    if (Line.length === 1) {

        rectLineIntersectionLB(Rect,[Line[0], M],
            function(a,b) {
                dlineFunc(...a,...b, 255,0,0);
            },
            function(a,b) {
                dlineFunc(...a,...b, 0,255,0);
                drawPixel(...b, 0,255,0);
            },
            function(a,b) {
                dlineFunc(...a,...b, 0,0,255);
            }
        );

    } else if (Line.length === 2) {
        dlineFunc(...Line[0], ...Line[1], 220,20,20);
        drawPixels(0,255,0,1, ...rectLineIntersectionCS(Rect,Line,()=>{},()=>{},()=>{}));
    }
    
    drawPixel(...M, 10,200,10);
}


const rectModeProc = function() {
    const poly = makeRectPoints(
        FigureRect.cx,
        FigureRect.cy,
        FigureRect.w,
        FigureRect.h,
        FigureRect.angle
    );

    const clipped = clipPolygonByRect(poly, Rect);

    fillPolygon(clipped, 180, 60, 60, 1);
    drawPolyLine(dlineFunc, true, 80, 0, 0, 1, ...poly);
}




function makeRectPoints(cx, cy, w, h, angle) {
    const pts = [
        [cx - w / 2, cy - h / 2],
        [cx + w / 2, cy - h / 2],
        [cx + w / 2, cy + h / 2],
        [cx - w / 2, cy + h / 2]
    ];

    return rotate(cx, cy, angle, ...pts);
}

function fillPolygon(points, r = 0, g = 0, b = 0, a = 1) {
    if (!points || points.length < 3) return;

    for (let i = 1; i < points.length - 1; i++) {
        fillTriangle(
            ...points[0],
            ...points[i],
            ...points[i + 1],
            r, g, b, a
        );
    }
}

function clipPolygonByRect(poly, rect) {
    const xMin = Math.min(rect[0][0], rect[2][0]);
    const xMax = Math.max(rect[0][0], rect[2][0]);
    const yMin = Math.min(rect[0][1], rect[2][1]);
    const yMax = Math.max(rect[0][1], rect[2][1]);

    function clipAgainstEdge(points, inside, intersect) {
        const result = [];
        if (!points || points.length === 0) return result;

        for (let i = 0; i < points.length; i++) {
            const cur = points[i];
            const prev = points[(i - 1 + points.length) % points.length];

            const curIn = inside(cur);
            const prevIn = inside(prev);

            if (curIn) {
                if (!prevIn) result.push(intersect(prev, cur));
                result.push(cur);
            } else if (prevIn) {
                result.push(intersect(prev, cur));
            }
        }
        return result;
    }

    function intersectWithX(p1, p2, x) {
        const dx = p2[0] - p1[0];
        if (dx === 0) return [x, p1[1]];
        const t = (x - p1[0]) / dx;
        return [x, p1[1] + t * (p2[1] - p1[1])];
    }

    function intersectWithY(p1, p2, y) {
        const dy = p2[1] - p1[1];
        if (dy === 0) return [p1[0], y];
        const t = (y - p1[1]) / dy;
        return [p1[0] + t * (p2[0] - p1[0]), y];
    }

    let out = poly;

    out = clipAgainstEdge(out, p => p[0] >= xMin, (a, b) => intersectWithX(a, b, xMin));
    out = clipAgainstEdge(out, p => p[0] <= xMax, (a, b) => intersectWithX(a, b, xMax));
    out = clipAgainstEdge(out, p => p[1] >= yMin, (a, b) => intersectWithY(a, b, yMin));
    out = clipAgainstEdge(out, p => p[1] <= yMax, (a, b) => intersectWithY(a, b, yMax));

    return out;
}


function rand(min, max) {
    return Math.random() * (max - min) + min;
}

function createRandomFigureRect() {
    const w = rand(canvas.width/5, canvas.width/2);
    const h = rand(canvas.width/5, canvas.width/2);
    const angle = rand(0, Math.PI * 2);

    const cx = rand(w / 2 + 2, canvas.width - w / 2 - 2);
    const cy = rand(h / 2 + 2, canvas.height - h / 2 - 2);

    return {
        cx, cy, w, h, angle
    };
}

function updateFigureRectByMouse() {
    if (!FigureRect) return;
    FigureRect.cx = M[0];
    FigureRect.cy = M[1];
}