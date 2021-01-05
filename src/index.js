import { World } from "./world.js";
import * as SVG from "./utils/svg.js";
import * as Debug from "./utils/debug.js";

let svg = SVG.createElement("svg", {});

function run() {
  let world = new World({
    seed: Date.now(),
    width: 800,
    height: 500,
  });

  svg.innerHTML = "";
  svg.setAttribute("width", world.width.toString());
  svg.setAttribute("height", world.height.toString());

  console.time("svg");
  svg.append(world.render());
  svg.append(frame(world.width, world.height, 10));
  document.body.append(svg);
  console.timeEnd("svg");
}

/**
 * @param {number} width
 * @param {number} height
 * @param {number} padding
 */
function frame(width, height, padding) {
  let g = SVG.createElement("g", { class: "frame" });

  let x0 = padding;
  let y0 = padding;
  let x1 = width - padding;
  let y1 = height - padding;

  let offset = 3;

  // White boxes to block outside of the frame
  let top = SVG.createElement("rect", { fill: "white", x: 0, y: 0, width, height: padding });
  let bottom = SVG.createElement("rect", { fill: "white", x: 0, y: height - padding, width, height: padding });
  let left = SVG.createElement("rect", { fill: "white", x: 0, y: 0, width: padding, height });
  let right = SVG.createElement("rect", { fill: "white", x: width - padding, y: 0, width: padding, height });
  g.append(top, bottom, left, right);

  let inner = SVG.createElement("rect", {
    stroke: "black",
    "stroke-width": 1.5,
    fill: "none",
    x: x0,
    y: y0,
    width: x1 - x0,
    height: y1 - y0,
  });

  let outer = SVG.createElement("rect", {
    stroke: "black",
    "stroke-width": 1.5,
    fill: "none",
    x: x0 - offset,
    y: y0 - offset,
    width: x1 - x0 + offset * 2,
    height: y1 - y0 + offset * 2,
  });

  g.append(inner, outer);

  return g;
}

run();

onkeydown = e => {
  if (e.key === " ") {
    e.preventDefault();
    Debug.cleanup();
    run();
  }
}
