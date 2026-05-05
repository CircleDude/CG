const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const img = ctx.createImageData(canvas.width, canvas.height);
const data = img.data;

// функция установки пикселя
function setPixel(x, y, r, g, b, a = 255) {
  const i = (y * canvas.width + x) * 4;
  data[i] = r;
  data[i+1] = g;
  data[i+2] = b;
  data[i+3] = a;
}

// пример: точка
setPixel(10, 10, 255, 0, 0);

// применяем
ctx.putImageData(img, 0, 0);