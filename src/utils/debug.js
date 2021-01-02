const COLORS = [0x2f4f4f, 0x006400, 0xbdb76b, 0x000080, 0xff0000, 0x00ced1, 0xffa500, 0xffff00, 0xc71585, 0x00ff00, 0x00fa9a, 0x0000ff, 0xd8bfd8, 0xff00ff, 0x1e90ff, 0xfa8072];

/**
 * @param {number} x
 */
export function colorCategorical(x) {
  return COLORS[x % COLORS.length];
}

/**
 * @param {number} x
 */
export function colorLinear(x) {
  return (0xFF * x << 16) | (0xFF * x << 8) | (0xFF * x);
}

export function delay(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Renders pixels to a canvas based on values in a 2d array.
 *
 * @param {number} width
 * @param {number} height
 * @param {NumericArray} array
 * @param {(val: number, index: number) => number} getColor
 */
export function createPixelView(width, height, array, getColor) {
  let canvas = document.createElement("canvas");
  let ctx = canvas.getContext("2d");
  canvas.width = width;
  canvas.height = height;

  let imageData = ctx.getImageData(0, 0, width, height);
  let pixels = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let i = x + y * width;
      let color = getColor(array[i], i);

      let j = i * 4;
      pixels[j] = color >> 16 & 0xFF;
      pixels[j + 1] = color >> 8 & 0xFF;
      pixels[j + 2] = color & 0xFF;
      pixels[j + 3] = 0xFF;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  canvas.className = "debug";
  canvas.style.imageRendering = "pixelated";
  canvas.style.display = "inline-block";
  document.body.append(canvas);

  return {
    canvas,
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} color (in hex 0xAABBCC)
     */
    set(x, y, color) {
      let imgData = ctx.getImageData(x, y, 1, 1);
      imgData.data[0] = color >> 16 & 0xFF;
      imgData.data[1] = color >> 8 & 0xFF;
      imgData.data[2] = color & 0xFF;
      imgData.data[3] = 0xFF;
      ctx.putImageData(imgData, x, y);
    },
    /**
     * @param {NumericArray} array
     */
    update(array) {
      let imageData = ctx.getImageData(0, 0, width, height);
      let pixels = imageData.data;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let i = x + y * width;
          let color = getColor(array[i], i);

          let j = i * 4;
          pixels[j] = color >> 16 & 0xFF;
          pixels[j + 1] = color >> 8 & 0xFF;
          pixels[j + 2] = color & 0xFF;
          pixels[j + 3] = 0xFF;
        }
      }

      ctx.putImageData(imageData, 0, 0);
    }
  }
}

/**
 * Remove any debugging visualizations that have been inserted into the
 * DOM.
 */
export function cleanup() {
  document.querySelectorAll(".debug").forEach(el => el.remove());
}
