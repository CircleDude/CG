let points = [];
let M = [];
let C = [];


document.addEventListener("DOMContentLoaded", function() {
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

    
    canvas.width = 60;
    canvas.height = canvas.width;

    C = [canvas.width/2, canvas.height/2];

    d3.select('#drawPolyLine').node().checked = true;

    d3.select('#clearPoints').on('click', function() {
        points = [];
        d3.select('#points').node().innerHTML = '';
    });
    
    d3.select('body').insert('div', 'div').attr('id', 'fps').node().innerHTML = 'fps';

    requestAnimationFrame(loop);
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
        points = rotate(C, d3.select('#rotSpeed').node().value, ...points);
    }

    d3.select('#pointsCount').node().innerHTML = points.length;
    d3.select('#points').node().innerHTML = [...points].map( p => ""+p+"<br>");
}    

const canvasUpdateIteration = function() {
    clear();
    drawGrid();

    let drawLineFunc = (d3.select('#antialiasing').node().checked) ?
        dSmoothLine : dLine;
    
    if (d3.select('#drawPolyLine').node().checked) {
        setColor('brown');
        if (points.length >= 1) drawLineFunc(points.at(-1), M);
    }

    if (points.length >= 2) {
        setColor('brown');
        dPolyLine(drawLineFunc, false, ...points);
    }

    setColor('blue');
    dPixel(C);
    
    setColor('green');
    dPixel(M);
}


function drawGrid() {
    let someColor = ctx.fillStyle;

    setColor('#'+'f5'.repeat(3));
    for (let y = 0; y < canvas.height; ++y) {
        for (let x = 0; x < canvas.width; ++x) {
            if (x%2 === y%2) drawPixel(x, y);
        }
    }

    setColor(someColor);
}