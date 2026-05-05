let canvas, ctx, img, data;

function setCurrentCanvas(id) {
    canvas = document.querySelector('#'+id);
    ctx = canvas.getContext("2d");
    img = ctx.createImageData(canvas.width, canvas.height);
    data = img.data;
}

function updateCanvasImage() {
    img = ctx.createImageData(canvas.width, canvas.height);
    data = img.data;
}

function drawPixel(x,y, r,g,b,a=1) {
    const i = (y * canvas.width + x) * 4;
    if (a === 1) {
        data[i]   = r;
        data[i+1] = g;
        data[i+2] = b;
    } else {
        data[i]     += (r - data[i]  ) * a;
        data[i + 1] += (g - data[i+1]) * a;
        data[i + 2] += (b - data[i+2]) * a;
    }
    data[i + 3] = 255;
}

function clearCanvas() {
    data.fill(255);
}

function updateCanvasContext() {
    ctx.putImageData(img, 0, 0);
}