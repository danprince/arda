import * as Terrain from "./terrain.js";
import * as SVG from "./utils/svg.js";

/**
 * @type {WorldGenerationParams}
 */
export const WORLD_GENERATION_DEFAULTS = {
  seed: 42,
  width: 200,
  height: 200,
  seaLevel: 0.5,
  noiseRoughess: 0.9,
  minLands: 1,
  maxLands: Infinity,
  minSeas: 0,
  maxSeas: Infinity,
  minPercentLand: 0.3,
  maxPercentLand: 1,
  minLandSize: 20,
  maxLandSize: Infinity,
  minSeaSize: 20,
  maxSeaSize: Infinity,
  maxRetries: 1000,
  maxSmoothingIterations: 100,
};

export class World {
  /**
   * @param {Partial<WorldGenerationParams>} params
   */
  constructor(params) {
    /**
     * @type {WorldGenerationParams}
     */
    this.params = { ...WORLD_GENERATION_DEFAULTS, ...params };
    this.width = this.params.width;
    this.height = this.params.height;

    /**
     * @type {Node[]}
     */
    this.nodes = [];

    /**
     * @type {Land[]}
     */
    this.lands = [];

    /**
     * @type {Sea[]}
     */
    this.seas = [];

    let terrain = Terrain.generate(this.params);

    for (let y = 0; y < terrain.height; y++) {
      for (let x = 0; x < terrain.width; x++) {
        let id = x + y * terrain.width;
        let z = terrain.heights[id];
        let node = new Node(id, x, y, z);
        node.moisture = terrain.moisture[id];
        this.nodes[id] = node;
        // TODO: Assign sea/land id
        // TODO: Apply node jitter?
        // TODO: Connectivity
      }
    }

    for (let profile of terrain.lands) {
      let land = new Land(this, profile.id, profile.tiles, profile.path);
      this.lands.push(land);
    }

    for (let profile of terrain.seas) {
      let sea = new Sea(this, profile.id, profile.tiles);
      this.seas.push(sea);
    }
  }

  render() {
    let commands = [];

    for (let land of this.lands) {
      let points = land.points();
      let path = SVG.closedPathFromPoints(points);
      commands.push(path);
    }

    let d = commands.join(" ");

    let g = SVG.createElement("g", {
      class: "terrain",
    });

    let sea = SVG.createElement("rect", {
      fill: "#eee",
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
    });

    g.append(sea);

    for (let contour of [14, 7]) {
      let outer = SVG.createElement("path", {
        "class": "coast",
        "stroke": "black",
        "stroke-width": contour,
        "stroke-linejoin": "round",
        "d": d,
      });

      let inner = SVG.createElement("path", {
        "class": "coast",
        "stroke": "#eee",
        "stroke-width": contour - 2,
        "stroke-linejoin": "round",
        "d": d,
      });

      g.append(outer, inner);
    }

    let land = SVG.createElement("path", {
      "class": "land",
      "stroke": "black",
      "stroke-width": 1.5,
      "fill": "white",
      "stroke-linejoin": "round",
      "d": d,
    });

    g.append(land);

    return g;
  }

  renderTerrainLabels() {
    let g = SVG.createElement("g", { class: "terrain-labels" });
    let defs = SVG.createElement("defs");

    g.append(defs);

    for (let sea of this.seas) {
      if (sea.size < 50_000) continue;
      let scale = sea.size / 200_000;
      let center = sea.center();
      let name = `Sea of ${sea.id}`;
      let text = SVG.createElement("text", {
        "x": center.x,
        "y": center.y,
        "font-family": "Cursive",
        "font-size": 10 + scale * 10,
      });
      text.textContent = name;
      g.append(text);
    }

    for (let land of this.lands) {
      if (land.size < 10000) continue;

      let name = `Land${land.id}`;
      let pathId = `label-land-${land.id}`;
      let scale = Math.min(2, land.size / 20000);
      let fontSize = 10 + scale * 10;
      let spacing = scale * 10;
      let length = name.length * (fontSize + spacing);
      let { x, y } = land.centroid();

      let path = SVG.createElement("path", {
        id: pathId,
        d: `M ${x - length / 2} ${y} q ${length / 2} ${length / 4} ${length} 0`,
        //"fill": "none",
        //"stroke": "magenta",
        //"stroke-width": 2,
      });

      //g.append(path);
      defs.append(path);

      let text = SVG.createElement("text", {
        class: "land-label",
        //"transform-origin": "center center",
        //"transform": `rotate(${rotate})`,
      });

      let textPath = SVG.createElement("textPath", {
        href: `#${pathId}`,
        x: x,
        y: y,
        "spacing": "auto",
        "font-size": fontSize,
        "font-weight": "bold",
        "font-family": "Garamond",
        "text-anchor": "middle",
        "alignment-baseline": "middle",
        "startOffset": "50%",
        "letter-spacing": spacing,
        "style": `text-transform: uppercase`,
        "fill": "#333",
      });

      textPath.textContent = name;
      text.append(textPath);

      g.append(text);
    }

    return g;
  }
}

export class Land {
  /**
   * @param {World} world
   * @param {number} id
   * @param {Set<number>} nodeIds
   * @param {number[]} pathNodeIds
   */
  constructor(world, id, nodeIds, pathNodeIds) {
    this.id = id;
    this.nodeIds = nodeIds;
    this.pathNodeIds = pathNodeIds;
    this.world = world;
  }

  get size() {
    return this.nodeIds.size;
  }

  points() {
    let n = this.pathNodeIds.length;
    let points = new Float32Array(n * 2);

    for (let i = 0; i < n; i++) {
      let id = this.pathNodeIds[i];
      let node = this.world.nodes[id];
      points[i * 2] = node.x;
      points[i * 2 + 1] = node.y;
    }

    return points;
  }

  bounds() {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = 0;
    let y1 = 0;

    for (let i = 0; i < this.pathNodeIds.length; i++) {
      let id = this.pathNodeIds[i];
      let node = this.world.nodes[id];
      if (node.x < x0) x0 = node.x;
      if (node.y < y0) y0 = node.y;
      if (node.x > x1) x1 = node.x;
      if (node.y > y1) y1 = node.y;
    }

    return { x0, y0, x1, y1 };
  }

  center() {
    let { x0, y0, x1, y1 } = this.bounds();
    let x = x0 + (x1 - x0) / 2;
    let y = y0 + (y1 - y0) / 2;
    return { x, y };
  }

  centroid() {
    let xs = 0;
    let ys = 0;

    for (let i = 0; i < this.pathNodeIds.length; i++) {
      let id = this.pathNodeIds[i];
      let node = this.world.nodes[id];
      xs += node.x;
      ys += node.y;
    }

    let x = xs / this.pathNodeIds.length;
    let y = ys / this.pathNodeIds.length;
    return { x, y };
  }
}

export class Sea {
  /**
   * @param {World} world
   * @param {number} id
   * @param {Set<number>} nodeIds
   */
  constructor(world, id, nodeIds) {
    this.world = world;
    this.id = id;
    this.nodeIds = nodeIds;
  }

  get size() {
    return this.nodeIds.size;
  }

  bounds() {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = 0;
    let y1 = 0;

    for (let id of this.nodeIds) {
      let node = this.world.nodes[id];
      if (node.x < x0) x0 = node.x;
      if (node.y < y0) y0 = node.y;
      if (node.x > x1) x1 = node.x;
      if (node.y > y1) y1 = node.y;
    }

    return { x0, y0, x1, y1 };
  }

  center() {
    let { x0, y0, x1, y1 } = this.bounds();
    let x = x0 + (x1 - x0) / 2;
    let y = y0 + (y1 - y0) / 2;
    return { x, y };
  }
}

export class Node {
  /**
   * @param {number} id
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  constructor(id, x, y, z) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.z = z;
    this.land = null;
    this.sea = null;
    this.moisture = 0;
    this.edges = [];
  }
}
