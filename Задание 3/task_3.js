let loopON = false;
let M = [];
const dlineFunc = drawLine;
// const dlineFunc = drawSmoothLine;
let modeProc = function() {};

document.addEventListener("DOMContentLoaded", function() {
    setCurrentCanvas('myCanvas');
    canvas.width = 60;
    // canvas.width = 1000;
    canvas.height = canvas.width / 1.5;
    updateCanvasImage();

    canvas.onmousemove = function(e) {
        M = getCanvasMousePoint(e);
    }
    
    canvas.onclick = function(e) {
        
    }

    d3.select('body').insert('div', 'div').attr('id', 'fps').node().innerHTML = 'fps';

    loop();
    canvas.onmouseenter = function(e) {
        if (loopON === false) {
            loopON = true;
            loop();
        }
    }
    canvas.onmouseleave = function(e) {
        loopON = false;
    }

    
    d3.select('#mode').node().onchange = function(e) {
        switch (d3.select('#mode').node().value) {
            case '':
                modeProc = ()=>{};
                break;
            case '':
                modeProc = ()=>{};
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

    modeProc();
    
    updateCanvasContext();
}


const lineModeProc = function() {
    
}


const rectModeProc = function() {
    
}