/**
 * Linear interpolation between two values.
 *
 * @param {number} x0
 * @param {number} x1
 * @param {number} value
 * @return {number}
 */
export function lerp(x0, x1, value) {
  return x0 + (x1 - x0) * value;
}
