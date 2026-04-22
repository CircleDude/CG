let loopON = false;
let M = [];
let Rect = [];
let Line = [];
const dlineFunc = dLine;

document.addEventListener("DOMContentLoaded", function() {
    canvas.onmousemove = function(e) {
        M =
            [Math.floor(e.offsetX / canvas.offsetWidth * canvas.width),
            Math.floor(e.offsetY / canvas.offsetHeight * canvas.height)];
    }
    
    canvas.onclick = function(e) {
        if (Line.length === 2) {
            Line = [];
        }
        Line.push(M);
    }

    canvas.width = 60;
    canvas.height = canvas.width / 1.5;

    Rect = [
        [canvas.width/4, canvas.height/4],
        [canvas.width/4*3, canvas.height/4],
        [canvas.width/4*3, canvas.height/4*3],
        [canvas.width/4, canvas.height/4*3]
    ];
    
    d3.select('body').insert('div', 'div').attr('id', 'fps').node().innerHTML = 'fps';

    // loop();
    canvas.onmouseenter = function(e) {
        if (!loopON) {
            loopON = true;
            loop();
        }
    }
    canvas.onmouseleave = function(e) {
        loopON = false;
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
    clear();

    setColor('lightgrey');
    dPolyLine(dlineFunc, true, ...Rect);

    if (Line.length === 1) {
        setColor('brown');
        dlineFunc(Line[0], M);

        setColor('limegreen');
        // dPixel(...rectLineIntersectionCS(Rect,[Line[0], M],()=>{},()=>{},()=>{}));
        dPixel(...rectLineIntersectionLB(Rect,[Line[0], M],()=>{},()=>{},()=>{}));

    } else if (Line.length === 2) {

        points = rectLineIntersectionCS(Rect,Line,
            function(a,b) {
                setColor('red');
                dlineFunc(a,b);
            },
            function(a,b) {
                setColor('YellowGreen');
                dlineFunc(a,b);
                dPixel(b);
            },
            function(a,b) {
                setColor('blue');
                dlineFunc(a,b);
            }
        );
    }
    
    setColor('green');
    dPixel(M);
}


const rectLineIntersectionCS = function(Rect, Line, outBegFunc, inFunc, outEndFunc) { // Алгоритм Коэна-Сазерленда
    if (Line.length !== 2) throw new Error("Line must have 2 points!");

    let xMin, xMax, yMin, yMax;
    let code = [];
    let points = [];

    xMax = Math.max(Rect[0][0], Rect[2][0]);
    xMin = Math.min(Rect[0][0], Rect[2][0]);

    yMax = Math.max(Rect[0][1], Rect[2][1]);
    yMin = Math.min(Rect[0][1], Rect[2][1]);

    Line.forEach( (p, i) => {
        code[i] = 0;
             if (p[0] < xMin) code[i] |= 1 << 0;
        else if (p[0] > xMax) code[i] |= 1 << 1;
             if (p[1] < yMin) code[i] |= 1 << 2;
        else if (p[1] > yMax) code[i] |= 1 << 3;
    });

    if ((code[0] | code[1]) === 0) {
        inFunc(...Line);
    } else if ((code[0] & code[1]) !== 0) {
        outBegFunc(...Line);
    } else {
        code.forEach( (el) => {
            if (el & 1 << 0) {
                points.push([xMin, coordCalc(Line[0][1],Line[0][0],Line[1][1],Line[1][0],xMin)]);
            }
            if (el & 1 << 1) {
                points.push([xMax, coordCalc(Line[0][1],Line[0][0],Line[1][1],Line[1][0],xMax)]);
            }
            if (el & 1 << 2) {
                points.push([coordCalc(Line[0][0],Line[0][1],Line[1][0],Line[1][1],yMin), yMin]);
            }
            if (el & 1 << 3) {
                points.push([coordCalc(Line[0][0],Line[0][1],Line[1][0],Line[1][1],yMax), yMax]);
            }
        });
    }
    
    points = points.filter( (p) => (xMin <= p[0] && p[0] <= xMax &&
                                    yMin <= p[1] && p[1] <= yMax));

    if (points.length > 2) {
        points = [points[0], points.at(-1)];
    }

    if (points.length === 0) {
        if (code[0]) outBegFunc(...Line);
        else inFunc(...Line);
    } else if (code[0] === 0) {
        if (points.length > 1) points.pop();
        inFunc(points[0], Line[0]);
        outEndFunc(Line[1], points[0]);
    } else if (code[1] === 0) {
        if (points.length > 1) points.shift();
        outBegFunc(Line[0], points[0]);
        inFunc(points[0], Line[1]);
    } else {
        outBegFunc(Line[0], points[0]);
        inFunc(points[0], points.at(-1));
        outEndFunc(Line[1], points.at(-1));
    }
    
    return points;

    function coordCalc(x0,y0, x1,y1, yi) {
        return Math.round(((y0-yi)*x1 - (y1-yi)*x0) / (y0-y1));
    }
}


const rectLineIntersectionLB = function(Rect, Line, outBegFunc, inFunc, outEndFunc) { // Алгоритм Ляна-Барского
    let p = [], q = [];
    let xMin, xMax, yMin, yMax;
    let dx = Line[1][0] - Line[0][0];
    let dy = Line[1][1] - Line[0][1];
    let points = [];

    xMax = Math.max(Rect[0][0], Rect[2][0]);
    xMin = Math.min(Rect[0][0], Rect[2][0]);

    yMax = Math.max(Rect[0][1], Rect[2][1]);
    yMin = Math.min(Rect[0][1], Rect[2][1]);

    p[0] = -dx;
    q[0] = Line[0][0] - xMin;
    p[1] = dx;
    q[1] = xMax - Line[0][0];

    p[2] = -dy;
    q[2] = Line[0][1] - yMin;
    p[3] = dy;
    q[3] = yMax - Line[0][1];

    // for (let i = 0; i <= 4; ++i) {
    //     if (p[i] != 0) {
    //         let t = q[i] / p[i];
    //         points.push([Math.round(Line[0][0] + t*dx), Math.round(Line[0][1] + t*dy)]);
    //     }
    // }

    let t = [];
    for (let i = 0; i <= 4; ++i) {
        if (p[i] != 0) {
            t[i] = q[i] / p[i];
        }
    }

    t = t.filter( (t_i) => (0 <= t_i && t_i <= 1));

    if (t.length > 2) {
        // t = t.sort( (a,b) => a-b);
        // console.log(t);
        // t = [t[0], t.at(-1)];
    }

    t.forEach((t_i) => {
        points.push([Math.round(Line[0][0] + t_i*dx), Math.round(Line[0][1] + t_i*dy)]);
    });

    points = points.filter( (p) => (xMin <= p[0] && p[0] <= xMax &&
                                    yMin <= p[1] && p[1] <= yMax));

    // if (points.length > 2) {
    //     points = [points[0], points.at(-1)];
    // }                                    

    // for (const q_i of q) {
    //     if (q_i < 0) {
    //         outBegFunc(...Line);
    //         // console.log('вне области');
    //         // return points;
    //     }
    // }
    // for (const p_i of p) {
    //     if (p_i < 0) {
    //         // console.log('с невидимой части области на видимую');
    //     } else if (p_i > 0) {
    //         // console.log('с видимой части области в невидимую');
    //     } else {
    //         // console.log('ноль');
    //     }
    // }

    return points;
}