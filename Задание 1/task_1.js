let points = [];
let M = [];
let C = [];

canvas.onmousemove = function(e) {
    M =
        [Math.floor(e.offsetX / 550 * canvas.width),
        Math.floor(e.offsetY / 550 * canvas.height)];
}

canvas.onclick = function(e) {
    if (d3.select('#drawPolyLine').node().checked) {
        points.push(M);
    } else {
        C = M;
    }
}


document.addEventListener("DOMContentLoaded", function() {
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

    updateDataItaration(dt);
    updateCanvasIteration();
    
    requestAnimationFrame(loop);
}

const updateDataItaration = function(dt) {
    d3.select('#x').node().innerHTML = 'x: ' + M[0];
    d3.select('#y').node().innerHTML = 'y: ' + M[1];

    if (d3.select('#animate').node().checked) {
        let rad = d3.select('#rotSpeed').node().value;
        let T =
            [[Math.cos(rad), Math.sin(rad), 0],
            [-Math.sin(rad), Math.cos(rad), 0],
            [0, 0, 1]];
        let N0 =
            [[1, 0, 0],
            [0, 1, 0],
            [-C[0], -C[1], 1]];
        let N1 =
            [[1, 0, 0],
            [0, 1, 0],
            [C[0], C[1], 1]];

        points = points.map(p => math.multiply([p[0], p[1], 1], N0, T, N1));
    }

    d3.select('#pointsCount').node().innerHTML = points.length;
    d3.select('#points').node().innerHTML = [...points].map( p => ""+p+"<br>");
}    

const updateCanvasIteration = function() {
    clear();
    drawGrid();

    let drawLineFunc = (d3.select('#antialiasing').node().checked) ?
        dSmoothPolyLine : dPolyLine;
    
    if (d3.select('#drawPolyLine').node().checked) {
        setColor('brown');
        if (points.length >= 1) drawLineFunc(points.at(-1), M);
    }

    if (points.length >= 2) {
        setColor('brown');
        drawLineFunc(...points);
    }

    setColor('blue');
    dPixel(C);
    
    setColor('green');
    dPixel(M);
}
