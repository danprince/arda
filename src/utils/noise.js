import * as PRNG from "./prng.js";

/**
 * Generate a 2d array of noise.
 *
 * TODO: Normalize vs clamp?
 *
 * @param {object} config
 * @param {number} config.width
 * @param {number} config.height
 * @param {number} [config.roughness] Scaled roughness for each step
 * @param {number} [config.jitter] Fixed jitter for all points
 * @param {number} [config.seed] Optional numeric seed to use for generation
 * @param {number[]} [config.corners] Optional hardcoded values for the corners
 */
export function diamondSquare({
  width,
  height,
  roughness = 0.5,
  jitter = 0,
  seed = Date.now(),
  corners,
}) {
  let rng = PRNG.create(seed);

  let minSize = Math.max(width, height);
  let size = 1;

  // Find a value for exp that will create a big enough array (diamond
  // square only works with 2^n + 1 sized arrays)
  for (let exp = 1; size <= minSize; exp++) {
    size = 2 ** exp + 1;
  }

  let array = new Float32Array(size * size);

  // Assign random corners
  let x0 = 0;
  let y0 = 0;
  let x1 = size - 1;
  let y1 = size - 1;

  if (corners) {
    array[x0 + y0 * size] = corners[0];
    array[x1 + y0 * size] = corners[1];
    array[x0 + y1 * size] = corners[2];
    array[x1 + y1 * size] = corners[3];
  } else {
    array[x0 + y0 * size] = PRNG.float(rng, 0, 1);
    array[x1 + y0 * size] = PRNG.float(rng, 0, 1);
    array[x0 + y1 * size] = PRNG.float(rng, 0, 1);
    array[x1 + y1 * size] = PRNG.float(rng, 0, 1);
  }

  for (let i = size - 1; i > 1; i /= 2) {
    // Decrease roughness with step size.
    let r = (i / size) * roughness + jitter;

    // -- Diamonds --
    //
    //   |x0 cx x1
    // --+--------
    // y0|s0    s1
    // cy|   cs
    // y1|s2    s3

    for (let y = 0; y < size - 1; y += i) {
      for (let x = 0; x < size - 1; x += i) {
        let x0 = x;
        let y0 = y;
        let x1 = x0 + i;
        let y1 = y0 + i;

        let s0 = array[x0 + y0 * size];
        let s1 = array[x1 + y0 * size];
        let s2 = array[x0 + y1 * size];
        let s3 = array[x1 + y1 * size];

        let cx = x0 + i / 2;
        let cy = y0 + i / 2;

        let v = (s0 + s1 + s2 + s3) / 4 + PRNG.float(rng, -r, r);
        array[cx + cy * size] = v;
      }
    }

    // -- Squares --
    //
    //   |x0 cx x1
    // --+--------
    // y0|s0 d0 s1
    // cy|d1 cs d2
    // y1|s2 d3 s3

    for (let y = 0; y < size - 1; y += i) {
      for (let x = 0; x < size - 1; x += i) {
        let hi = i / 2;
        let x0 = x;
        let y0 = y;
        let x1 = x0 + i;
        let y1 = y0 + i;

        let s0 = array[x0 + y0 * size];
        let s1 = array[x1 + y0 * size];
        let s2 = array[x0 + y1 * size];
        let s3 = array[x1 + y1 * size];

        let cx = x0 + hi;
        let cy = y0 + hi;
        let cs = array[cx + cy * size];

        let d0 = y0 === 0
          ? (s0 + cs + s1) / 3
          : (s0 + cs + s1 + array[cx + (y0 - hi) * size]) / 4;

        let d1 = x0 === 0
          ? (s0 + cs + s2) / 3
          : (s0 + cs + s2 + array[x0 - hi + cy * size]) / 4;

        let d2 = x1 === size - 1
          ? (s1 + cs + s3) / 3
          : (s1 + cs + s3 + array[x1 + hi + cy * size]) / 4;

        let d3 = y1 === size - 1
          ? (cs + s2 + s3) / 3
          : (cs + s2 + s3 + array[cx + (y1 + hi) * size]) / 4;

        array[cx + y0 * size] = d0 + PRNG.float(rng, -r, r);
        array[x0 + cy * size] = d1 + PRNG.float(rng, -r, r);
        array[x1 + cy * size] = d2 + PRNG.float(rng, -r, r);
        array[cx + y1 * size] = d3 + PRNG.float(rng, -r, r);
      }
    }
  }

  // Clamp all values to 0-1
  for (let i = 0; i < array.length; i++) {
    array[i] = Math.max(0, Math.min(1, array[i]));
  }

  // If (by coincidence) the requested size is already 2^n + 1 then we
  // can skip reshaping the data and return it directly.
  if (size === width && size === height) {
    return array;
  }

  // Otherwise we need to reshape the data to the requested size.
  let slice = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    let i = y * size;
    let j = i + width;
    let row = array.subarray(i, j);
    slice.set(row, y * width);
  }

  return slice;
}
