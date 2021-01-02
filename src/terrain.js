import * as PRNG from "./utils/prng.js";
import * as Noise from "./utils/noise.js";
import * as Debug from "./utils/debug.js";

export const WATER = 0;
export const LAND = 1;

/**
 * Thrown when the terrain can't be generated under the current constraints.
 */
export class TerrainGenerationError extends Error {}

/**
 * @param {WorldGenerationParams} params
 */
export function generate({ seed, ...params }) {
  let rng = PRNG.create(seed);

  for (let i = 0; i < params.maxRetries; i++) {
    console.group(`try=${i} seed=${seed}`);

    try {
      return generateUnsafe({ seed, ...params });
    } catch (err) {

      if (err instanceof TerrainGenerationError) {
        console.warn(err.message);
        // Generate a new seed
        seed = PRNG.int(rng);
        // Remove any temporary debugging stuff we made
        Debug.cleanup();
      } else {
        throw err;
      }

    } finally {
      console.groupEnd();
    }
  }

  throw new Error(`Could not generate terrain in ${params.maxRetries} tries`);
}

/**
 * Generates terrain and throws a {@link TerrainGenerationError} if
 * generation fails.
 *
 * @param {WorldGenerationParams} params
 */
export function generateUnsafe(params) {
  let { width, height, seed } = params;
  let rng = PRNG.create(seed);

  console.time("noise");
  let heightMap = Noise.diamondSquare({
    seed: PRNG.int(rng),
    width: width,
    height: height,
    roughness: params.noiseRoughess,
  });
  console.timeEnd("noise");

  console.time("moisture");
  let moistureMap = Noise.diamondSquare({
    seed: PRNG.int(rng),
    width,
    height,
    roughness: 2,
  });
  console.timeEnd("moisture");

  console.time("discrete");
  let terrain = createFromHeightMap({
    width,
    height,
    heightMap,
    seaLevel: params.seaLevel,
  });
  console.timeEnd("discrete");

  let landPercent = calculateLandPercent(terrain);

  if (landPercent < params.minPercentLand) {
    throw new TerrainGenerationError(`Wanted at least ${params.minPercentLand * 100}% lands, got ${landPercent * 100}%`);
  }

  if (landPercent > params.maxPercentLand) {
    throw new TerrainGenerationError(`Wanted at most ${params.maxPercentLand * 100}% lands, got ${landPercent * 100}%`);
  }

  console.time("smoothing");
  smooth({
    width,
    height,
    terrain,
    minNeighbours: 4,
    iterations: params.maxSmoothingIterations,
  });
  console.timeEnd("smoothing");

  console.time("detect seas");
  let seas = detectSeas({ width, height, terrain }).filter(sea => {
    return (
      sea.tiles.size >= params.minSeaSize &&
      sea.tiles.size <= params.maxSeaSize
    );
  });
  console.timeEnd("detect seas");

  if (seas.length < params.minSeas) {
    throw new TerrainGenerationError(`Wanted at least ${params.minSeas} seas, got ${seas.length}`);
  }

  if (seas.length > params.maxSeas) {
    throw new TerrainGenerationError(`Wanted at most ${params.maxSeas} seas, got ${seas.length}`);
  }

  console.time("detect lands");
  let lands = detectLands({ width, height, terrain }).filter(land => {
    return (
      land.tiles.size >= params.minLandSize &&
      land.tiles.size <= params.maxLandSize
    );
  });
  console.timeEnd("detect lands");

  if (lands.length < params.minLands) {
    throw new TerrainGenerationError(`Wanted at least ${params.minLands} lands, got ${lands.length}`);
  }

  if (lands.length > params.maxLands) {
    throw new TerrainGenerationError(`Wanted at most ${params.maxLands} lands, got ${lands.length}`);
  }

  //console.time("debugrender");
  //Debug.createPixelView(width, height, heightMap, Debug.colorLinear);
  //Debug.createPixelView(width, height, terrain, v => v === SEA ? 0x0033FF : 0xFFFFFF);
  //Debug.createPixelView(width, height, moistureMap, v => v * 0x0000FF);
  //console.timeEnd("debugrender");

  return {
    width,
    height,
    heights: heightMap,
    moisture: moistureMap,
    types: terrain,
    seas,
    lands,
  };
}

/**
 * @param {Uint8Array} terrain
 */
function calculateLandPercent(terrain) {
  let land = 0;

  for (let i = 0; i < terrain.length; i++) {
    if (terrain[i] === LAND) {
      land += 1;
    }
  }

  return land / terrain.length;
}

/**
 * @param {object} params
 * @param {number} params.width
 * @param {number} params.height
 * @param {Float32Array} params.heightMap
 * @param {number} [params.seaLevel]
 * @return {Uint8Array}
 */
export function createFromHeightMap({
  width,
  height,
  heightMap,
  seaLevel = 0.5,
}) {
  let terrain = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let i = x + y * width;
      terrain[i] = heightMap[i] > seaLevel ? LAND : WATER;
    }
  }

  return terrain;
}

/**
 * Use cellular automata to flip any terrain tiles that don't have too
 * few neighbours.
 *
 * @param {object} params
 * @param {number} params.width
 * @param {number} params.height
 * @param {Uint8Array} params.terrain
 * @param {number} [params.minNeighbours]
 * @param {number} [params.iterations]
 */
export function smooth({
  width,
  height,
  terrain,
  minNeighbours = 4,
  iterations = 1,
}) {
  let current = Uint8Array.from(terrain);
  let next = Uint8Array.from(terrain);

  for (let i = 0; i < iterations; i++) {
    let stable = true;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let value = current[x + y * width];
        let neighbours = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            // Ignore the current cell
            if (dx === 0 && dy === 0) continue;

            let nx = x + dx;
            let ny = y + dy;
            let sample = value;

            if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
              sample = current[nx + ny * width];
            }

            if (sample === value) {
              neighbours += 1;
            }
          }
        }

        if (neighbours < minNeighbours) {
          next[x + y * width] = value ^ 1;
          stable = false;
        } else {
          next[x + y * width] = value;
        }
      }
    }

    [current, next] = [next, current];

    if (stable) break;
  }

  terrain.set(current);
}

/**
 * @typedef {object} SeaProfile
 * @prop {number} id
 * @prop {Set<number>} tiles
 */

/**
 * @param {object} params
 * @param {number} params.width
 * @param {number} params.height
 * @param {Uint8Array} params.terrain
 * @return {SeaProfile[]}
 */
export function detectSeas({ width, height, terrain }) {
  let currentSeaId = 1;

  /**
   * @type {number[]}
   */
  let stack = [];

  /**
   * @type {SeaProfile[]}
   */
  let seas = [];

  let ocean = new Uint8Array(width * height);

  for (let y = 0; y < width; y++) {
    for (let x = 0; x < height; x++) {
      let i = x + y * width;
      // Seas must start from an edge tile
      if (x > 0 && y > 0 && x < width - 1 && y < height - 1) continue;

      // Seas must initially be marked as water
      if (terrain[i] !== WATER) continue;

      // Start the floodfill from this tile
      stack.push(i);

      let tiles = new Set();

      while (stack.length > 0) {
        let i = stack.pop();
        let x = i % width;
        let y = i / width | 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;

            let nx = x + dx;
            let ny = y + dy;
            let n = nx + ny * width;

            if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
              if (terrain[n] === WATER && ocean[n] === 0) {
                ocean[n] = 1;
                stack.push(n);
                tiles.add(n);
              }
            }
          }
        }
      }

      seas.push({
        id: currentSeaId,
        tiles
      });

      currentSeaId += 1;
    }
  }

  for (let i = 0; i < terrain.length; i++) {
    terrain[i] = ocean[i] ? WATER : LAND;
  }

  return seas;
}

/**
 * @typedef {object} LandProfile
 * @prop {number} id
 * @prop {Set<number>} tiles
 * @prop {number[]} path
 */

/**
 * @param {object} params
 * @param {number} params.width
 * @param {number} params.height
 * @param {Uint8Array} params.terrain
 * @return {LandProfile[]}
 */
export function detectLands({ width, height, terrain }) {
  let seen = new Uint8Array(width * height);
  let currentLandId = 0;

  /**
   * @type {LandProfile[]}
   */
  let lands = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let id = x + y * width;

      if (terrain[id] === WATER) {
        continue;
      }

      if (seen[id]) {
        continue;
      }

      // Floodfill to discover the size of this land
      let stack = [id];
      let tiles = new Set();

      while (stack.length > 0) {
        let id = stack.pop();
        let x = id % width;
        let y = id / width | 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            let nx = x + dx;
            let ny = y + dy;

            if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
              let n = nx + ny * width;
              if (terrain[n] === WATER) continue;
              if (seen[n]) continue;
              seen[n] = 1;
              stack.push(n);
              tiles.add(n);
            }
          }
        }
      }

      let path = trace({
        x,
        y,
        width,
        height,
        terrain,
        type: LAND,
      });

      lands.push({
        id: currentLandId,
        tiles,
        path,
      });

      currentLandId += 1;
    }
  }

  return lands;
}

// 0 1 2
// 7   3
// 6 5 4

const MOORE_NEIGHBOURHOOD = [
  [-1, -1],
  [+0, -1],
  [+1, -1],
  [+1, +0],
  [+1, +1],
  [+0, +1],
  [-1, +1],
  [-1, +0],
];

export function trace({
  x,
  y,
  width,
  height,
  terrain,
  type,
}) {
  // Start coords
  let sx = x;
  let sy = y;

  // Current coords
  let px = x;
  let py = y;

  // Backtrack coords
  let bx = x - 1;
  let by = y;

  let path = [];
  let neighbours = MOORE_NEIGHBOURHOOD;

  while (true) {
    // Calculate the Moore neighbour offset to start the clockwise
    // walk around the neighbourhood.
    let offset = 0;

    // 0 1 2
    // 7   3
    // 6 5 4

    if (px > bx) offset = 7;      // Approached from the left
    else if (px < bx) offset = 3; // Approached from the right
    else if (py > by) offset = 1; // Approached from above
    else if (py < by) offset = 5; // Approached from below

    bx = px;
    by = py;

    for (let i = 0; i < neighbours.length; i++) {
      let index = (i + offset) % neighbours.length;
      let [dx, dy] = neighbours[index];
      let nx = px + dx;
      let ny = py + dy;
      let n = nx + ny * width;
      let valid = nx >= 0 && ny >= 0 && nx < width && ny < height;

      if (valid && terrain[n] === type) {
        // If we've found land make this tile the current tile
        px = nx;
        py = ny;

        // Don't visit the same point twice in a row.
        if (path[path.length - 1] === n) {
          continue;
        }

        path.push(n);
        break;
      } else {
        // Otherwise make this tile the backtracking tile
        bx = nx;
        by = ny;
      }
    }

    // When we returned to the start coordinate, we've finished tracing
    if (px === sx && py === sy) {
      break;
    }
  }

  return path;
}
