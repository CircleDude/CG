const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

function setColor(someColor) {
    ctx.fillStyle = someColor;
}

const POINT = {
    x: 0,
    y: 0
};

function putPixel(x, y) {
    ctx.fillRect(x, y, 1, 1);
}


function putGrid() {
    let someColor = ctx.fillStyle;

    setColor('#eeeeee');
    for (let y = 0; y < canvas.height; ++y) {
        for (let x = 0; x < canvas.width; ++x) {
            if (x%2 === y%2) putPixel(x, y);
        }
    }

    setColor(someColor);
}

// task_1

// function putLine(A, B)
