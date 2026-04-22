let canvas, ctx;

document.addEventListener("DOMContentLoaded", function() {
    canvas = d3.select("#myCanvas").node();
    ctx = canvas.getContext("2d");
});


function setColor(someColor) {
    ctx.fillStyle = someColor;
}
function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawPixel(x, y) {
    ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
}
function dPixel(...points) {
    for (let p of points) {
        drawPixel(...p);
    }
}
function drawPixelColor(x, y, c) {
    setColor(c);
    drawPixel(x, y);
}


// task_1

function rotate(centerPoint, rad, ...points) {
    let T =
        [[Math.cos(rad), Math.sin(rad), 0],
        [-Math.sin(rad), Math.cos(rad), 0],
        [0, 0, 1]];
    let N0 =
        [[1, 0, 0],
        [0, 1, 0],
        [-centerPoint[0], -centerPoint[1], 1]];
    let N1 =
        [[1, 0, 0],
        [0, 1, 0],
        [centerPoint[0], centerPoint[1], 1]];

    return points.map(p => math.multiply([p[0], p[1], 1], N0, T, N1));
}


function drawLine(x0,y0, x1,y1) { // Алгоритм Брезенхема
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
        drawPixel(x,y);
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
function dLine(A, B) {
    drawLine(...A, ...B);
}


function drawSmoothLine(x0,y0, x1,y1) { // Алгоритм Ву
    const fpart = (x => x - Math.floor(x));
    const rfpart = (x => 1 - fpart(x));

    let inputColor = ctx.fillStyle;
    let col = {
        r: parseInt(inputColor[1]+inputColor[2], 16),
        g: parseInt(inputColor[3]+inputColor[4], 16),
        b: parseInt(inputColor[5]+inputColor[6], 16),
        a: 1,
        
        rgb() {
            return `${this.r}, ${this.g}, ${this.b}`;
        }
    }

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
        drawPixelColor(ypxl1, xpxl1, `rgba(${col.rgb()}, ${rfpart(yend) * xgap})`);
        drawPixelColor(ypxl1+1, xpxl1, `rgba(${col.rgb()}, ${fpart(yend) * xgap})`);
    } else {
        drawPixelColor(xpxl1, ypxl1, `rgba(${col.rgb()}, ${rfpart(yend) * xgap})`);
        drawPixelColor(xpxl1, ypxl1+1, `rgba(${col.rgb()}, ${fpart(yend) * xgap})`);
    }
    let intery = yend + gradient;

    xend = Math.ceil(x1);
    yend = y1 + gradient * (xend - x1);
    xgap = 1 - (xend - x1);
    let xpxl2 = xend;
    let ypxl2 = Math.floor(yend);

    if (steep) {
        drawPixelColor(ypxl2, xpxl2, `rgba(${col.rgb()}, ${rfpart(yend) * xgap})`);
        drawPixelColor(ypxl2+1, xpxl2, `rgba(${col.rgb()}, ${fpart(yend) * xgap})`);
    } else {
        drawPixelColor(xpxl2, ypxl2, `rgba(${col.rgb()}, ${rfpart(yend) * xgap})`);
        drawPixelColor(xpxl2, ypxl2+1, `rgba(${col.rgb()}, ${fpart(yend) * xgap})`);
    }

    if (steep) {
        for (let x = xpxl1 + 1; x <= xpxl2 - 1; ++x) {
            drawPixelColor(Math.floor(intery), x, `rgba(${col.rgb()}, ${rfpart(intery)})`);
            drawPixelColor(Math.floor(intery)+1, x, `rgba(${col.rgb()}, ${fpart(intery)})`);
            intery += gradient;
        }
    } else {
        for (let x = xpxl1 + 1; x <= xpxl2 - 1; ++x) {
            drawPixelColor(x, Math.floor(intery), `rgba(${col.rgb()}, ${rfpart(intery)})`);
            drawPixelColor(x, Math.floor(intery)+1, `rgba(${col.rgb()}, ${fpart(intery)})`);
            intery += gradient;
        }
    }

    setColor(inputColor);
}
function dSmoothLine(A, B) {
    drawSmoothLine(...A, ...B);
}


function dPolyLine(dLineFunc, closed, ...points) {
    for (let i = 1; i < points.length; ++i) {
        dLineFunc(points[i-1], points[i]);
    }
    if (closed) dLineFunc(points.at(-1), points[0]);
}


