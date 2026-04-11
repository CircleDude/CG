let x0 = 0;
let y0 = 0;
let x1 = 4;
let y1 = 8;

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
    putPixel(x,y);
    while (e >= 0) {
        if (exch) x += s1;
        else y += s2;
        e -= 2 * dx;
    }
    if (exch) y += s2
    else x += s1;
    e += 2 * dy;
}

