let points = [];
let M = [];
let C = [];


document.addEventListener("DOMContentLoaded", function() {
    setCurrentCanvas('myCanvas');
    canvas.width = 60;
    canvas.height = canvas.width;
    updateCanvasImage();

    canvas.onmousemove = function(e) {
        M =
            [Math.floor(e.offsetX / canvas.offsetWidth * canvas.width),
            Math.floor(e.offsetY / canvas.offsetHeight * canvas.height)];
    }

    canvas.onclick = function(e) {
        if (d3.select('#drawPolyLine').node().checked) {
            points.push(M);
        } else {
            C = M;
        }
    }

    C = [canvas.width/2, canvas.height/2];
    // C = rotate([0,0], 1, C);

    d3.select('#drawPolyLine').node().checked = true;

    d3.select('#clearPoints').on('click', function() {
        points = [];
        d3.select('#points').node().innerHTML = '';
    });
    
    d3.select('body').insert('div', 'div').attr('id', 'fps').node().innerHTML = 'fps';

    loop();
})


let lastTime = 0;
const loop = function(time) {
    const dt = time - lastTime;
    lastTime = time;

    d3.select('#fps').node().innerHTML = `fps: ${Math.floor(1 / dt * 1000)}`;

    dataUpdateItaration(dt);
    canvasUpdateIteration();
    
    requestAnimationFrame(loop);
}


const dataUpdateItaration = function(dt) {
    d3.select('#x').node().innerHTML = 'x: ' + M[0];
    d3.select('#y').node().innerHTML = 'y: ' + M[1];

    if (d3.select('#animate').node().checked) {
        points = rotate(...C, d3.select('#rotSpeed').node().value, ...points);
    }

    d3.select('#pointsCount').node().innerHTML = points.length;
    d3.select('#points').node().innerHTML = [...points].map( p => ""+p+"<br>");
}    

const canvasUpdateIteration = function() {
    clearCanvas();
    drawGrid();

    let drawLineFunc = (d3.select('#antialiasing').node().checked) ?
        drawSmoothLine : drawLine;
    
    if (d3.select('#drawPolyLine').node().checked) {
        if (points.length >= 1) drawLineFunc(...points.at(-1), ...M, 220,20,20,1);
    }

    if (points.length >= 2) {
        drawPolyLine(drawLineFunc, false, 220,20,20,1, ...points);
    }

    drawPixel(...C, 0,0,255);
    
    drawPixel(...M, 0,255,0);

    updateCanvasContext();
}


function drawGrid() {
    for (let y = 0; y < canvas.height; ++y) {
        for (let x = 0; x < canvas.width; ++x) {
            if (x%2 === y%2) drawPixel(x, y, 0,0,0,0.04);
        }
    }
}