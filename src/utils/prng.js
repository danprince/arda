/**
 * PRNG implementation borrowed from Silmarils.
 * See: https://silmarils.netlify.app/modules/_prng_.html
 */

/**
 * @typedef {object} RNG
 * @prop {number} seed
 * @prop {number} state
 */

/**
 * Create a seeded random number generator.
 * @param {number} seed
 * @return {RNG}
 */
export function create(seed) {
  let state = seed % 2147483647;

  if (state <= 0) {
    seed += 2147483646;
  }

  return {
    seed: seed,
    state: state,
  };
}

/**
 * @param {RNG} rng
 */
function next(rng) {
  rng.state = rng.state * 16807 % 2147483647;
  return (rng.state - 1) / 2147483646;
}

/**
 * Generates an integer between `min` (inclusive) and `max` (exclusive).
 *
 * @param {RNG} rng
 * @param {number} [min]
 * @param {number} [max]
 * @return {number}
 */
export function int(rng, min = 0, max = Number.MAX_SAFE_INTEGER) {
  return Math.floor(min + next(rng) * (max - min));
}

/**
 * Generates a floating point number between `min` (inclusive) and `max`
 * (exclusive).
 *
 * @param {RNG} rng
 * @param {number} [min]
 * @param {number} [max]
 * @return {number}
 */
export function float(rng, min = 0, max = Number.MAX_VALUE) {
  return min + next(rng) * (max - min);
}

/**
 * Return a boolean based on a probability.
 *
 * @param {RNG} rng
 * @param {number} probability A number between 0 and 1 representing the
 * likelihood that true will be returned. A probability of 0 will
 * always return false and a probability of 1 will always return true.
 */
export function chance(rng, probability) {
  return next(rng) <= probability;
}
