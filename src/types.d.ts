declare type TypedArray =
  | Uint8Array
  | Uint8ClampedArray
  | Uint16Array
  | Uint32Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Float32Array
  | Float64Array;

declare type NumericArray =
  | Array<number>
  | TypedArray

declare interface WorldGenerationParams {
  seed: number,
  width: number,
  height: number,
  seaLevel: number,
  noiseRoughess: number,
  maxSmoothingIterations: number,
  minLands: number,
  maxLands: number,
  minSeas: number,
  maxSeas: number,
  minPercentLand: number,
  maxPercentLand: number,
  minLandSize: number,
  maxLandSize: number,
  minSeaSize: number,
  maxSeaSize: number,
  maxRetries: number,
}
