
// task_1

function rotate(cx,cy, rad, ...points) {
    let T =
        [[Math.cos(rad), Math.sin(rad), 0],
        [-Math.sin(rad), Math.cos(rad), 0],
        [0, 0, 1]];
    let N0 =
        [[1, 0, 0],
        [0, 1, 0],
        [-cx, -cy, 1]];
    let N1 =
        [[1, 0, 0],
        [0, 1, 0],
        [cx, cy, 1]];

    return points.map(p => {
        let res = math.multiply([p[0], p[1], 1], N0, T, N1);
        return [res[0], res[1]];
    });
}

function drawPixels(r,g,b,a, ...points) {
    points.forEach( (p) => drawPixel(...p, r,g,b,a));
}

function drawLine(x0,y0, x1,y1, r=0,g=0,b=0,a=1) { // Алгоритм Брезенхема
    x0 = Math.floor(x0);
    y0 = Math.floor(y0);
    x1 = Math.floor(x1);
    y1 = Math.floor(y1);

    let x = x0;
    let y = y0;
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let s1 = Math.sign(x1 - x0);
    let s2 = Math.sign(y1 - y0);
    let exch = false;
    let e;
    
    if (dy > dx) {
        let temp = dx;
        dx = dy;
        dy = temp;
        exch = true;
    }
    e = 2 * dy - dx;
    for(let i = 1; i <= dx; ++i) {
        drawPixel(x,y, r,g,b,a);
        while (e >= 0) {
            if (exch) x += s1;
            else y += s2;
            e -= 2 * dx;
        }
        if (exch) y += s2
        else x += s1;
        e += 2 * dy;
    }
}

function drawSmoothLine(x0,y0, x1,y1, r=0,g=0,b=0,a=1) { // Алгоритм Ву
    const fpart = (x => x - Math.floor(x));
    const rfpart = (x => 1 - fpart(x));

    let steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
    let gradient;

    if (steep) {
        let temp = x0;
        x0 = y0;
        y0 = temp;

        temp = x1;
        x1 = y1;
        y1 = temp;
    }
    if (x0 > x1) {
        let temp = x0;
        x0 = x1;
        x1 = temp;

        temp = y0;
        y0 = y1;
        y1 = temp;
    }

    let dx = x1 - x0;
    let dy = y1 - y0;

    if (dx == 0)
        gradient = 1;
    else
        gradient = dy/dx;

    let xend = Math.floor(x0);
    let yend = y0 + gradient * (xend - x0);
    let xgap = 1 - (x0 - xend);
    let xpxl1 = xend;
    let ypxl1 = Math.floor(yend);
    
    if (steep) {
        drawPixel(ypxl1, xpxl1, r,g,b, a * rfpart(yend) * xgap);
        drawPixel(ypxl1+1, xpxl1, r,g,b, a * fpart(yend) * xgap);
    } else {
        drawPixel(xpxl1, ypxl1, r,g,b, a * rfpart(yend) * xgap);
        drawPixel(xpxl1, ypxl1+1, r,g,b, a * fpart(yend) * xgap);
    }
    let intery = yend + gradient;

    xend = Math.ceil(x1);
    yend = y1 + gradient * (xend - x1);
    xgap = 1 - (xend - x1);
    let xpxl2 = xend;
    let ypxl2 = Math.floor(yend);

    if (steep) {
        drawPixel(ypxl2, xpxl2, r,g,b, a * rfpart(yend) * xgap);
        drawPixel(ypxl2+1, xpxl2, r,g,b, a * fpart(yend) * xgap);
    } else {
        drawPixel(xpxl2, ypxl2, r,g,b, a * rfpart(yend) * xgap);
        drawPixel(xpxl2, ypxl2+1, r,g,b, a * fpart(yend) * xgap);
    }

    if (steep) {
        for (let x = xpxl1 + 1; x <= xpxl2 - 1; ++x) {
            drawPixel(Math.floor(intery), x, r,g,b, a * rfpart(intery));
            drawPixel(Math.floor(intery)+1, x, r,g,b, a * fpart(intery));
            intery += gradient;
        }
    } else {
        for (let x = xpxl1 + 1; x <= xpxl2 - 1; ++x) {
            drawPixel(x, Math.floor(intery), r,g,b, a * rfpart(intery));
            drawPixel(x, Math.floor(intery)+1, r,g,b, a * fpart(intery));
            intery += gradient;
        }
    }
}

function drawPolyLine(dLineFunc, closed, r,g,b,a, ...points) {
    for (let i = 1; i < points.length; ++i) {
        dLineFunc(...points[i-1], ...points[i], r,g,b,a);
    }
    if (closed) dLineFunc(...points.at(-1), ...points[0], r,g,b,a);
}

// task_2

function rectLineIntersectionCS(Rect, Line, outBegFunc, inFunc, outEndFunc) { // Алгоритм Коэна-Сазерленда
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

function rectLineIntersectionLB(Rect, Line, outBegFunc, inFunc, outEndFunc) { // Алгоритм Ляна-Барского
    let p = [], q = [];
    let xMin, xMax, yMin, yMax;
    let dx = Line[1][0] - Line[0][0];
    let dy = Line[1][1] - Line[0][1];

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

    let tEnter = 0;
    let tLeave = 1;

    for (let i = 0; i < 4; i++) {
        if (p[i] === 0) {
            if (q[i] < 0) {
                outBegFunc(Line[0], Line[1]);
                return [];
            }
        } else {
            let t = q[i] / p[i];

            if (p[i] < 0) {
                tEnter = Math.max(tEnter, t);
            } else {
                tLeave = Math.min(tLeave, t);
            }
        }
    }

    if (tEnter > tLeave) {
        outBegFunc(Line[0], Line[1]);
        return [];
    }

    let points = [
        [Line[0][0] + tEnter * dx, Line[0][1] + tEnter * dy],
        [Line[0][0] + tLeave * dx, Line[0][1] + tLeave * dy]
    ].map(p => [Math.round(p[0]), Math.round(p[1])]);

    outBegFunc(Line[0], points[0]);
    inFunc(points[0], points.at(-1));
    outEndFunc(Line[1], points.at(-1));

    return points;
}

function walkLine(x0,y0, x1,y1, func) { // Обход как у Брезенхема
    x0 = Math.floor(x0);
    y0 = Math.floor(y0);
    x1 = Math.floor(x1);
    y1 = Math.floor(y1);

    let x = x0;
    let y = y0;
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let s1 = Math.sign(x1 - x0);
    let s2 = Math.sign(y1 - y0);
    let exch = false;
    let e;
    
    if (dy > dx) {
        let temp = dx;
        dx = dy;
        dy = temp;
        exch = true;
    }
    e = 2 * dy - dx;
    for(let i = 1; i <= dx; ++i) {
        func(x,y);
        while (e >= 0) {
            if (exch) x += s1;
            else y += s2;
            e -= 2 * dx;
        }
        if (exch) y += s2
        else x += s1;
        e += 2 * dy;
    }
}

function fillTriangle(x0,y0, x1,y1, x2,y2, r=0,g=0,b=0,a=1) { // Edge function

    function edge(ax, ay, bx, by, px, py) {
        return (px - ax)*(by - ay) - (py - ay)*(bx - ax);
    }

    let area = edge(x0,y0, x1,y1, x2,y2);
    if (area < 0) {
        [x1, x2] = [x2, x1];
        [y1, y2] = [y2, y1];
    }

    let minX = Math.floor(Math.min(x0, x1, x2));
    let maxX = Math.ceil (Math.max(x0, x1, x2));
    let minY = Math.floor(Math.min(y0, y1, y2));
    let maxY = Math.ceil (Math.max(y0, y1, y2));

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {

            let px = x + 0.5;
            let py = y + 0.5;

            let w0 = edge(x1,y1, x2,y2, px,py);
            let w1 = edge(x2,y2, x0,y0, px,py);
            let w2 = edge(x0,y0, x1,y1, px,py);

            if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
                drawPixel(x, y, r,g,b,a);
            }
        }
    }
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

// task_3

