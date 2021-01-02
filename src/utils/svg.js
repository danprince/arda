const NAMESPACE_URI = "http://www.w3.org/2000/svg";

/**
 * @param {string} name
 * @param {object} [attrs]
 * @param {SVGElement[]} [children]
 */
export function createElement(name, attrs = {}, children = []) {
  let element = document.createElementNS(NAMESPACE_URI, name);

  for (let key in attrs) {
    element.setAttribute(key, attrs[key]);
  }

  for (let i = 0; i < children.length; i++) {
    let child = children[i];
    element.appendChild(child);
  }

  return element;
}

/**
 * Create SVG path commands from a (typed) array of points.
 * E.g. [x0, y0, x1, y1, x2, y2]
 *
 * @param {NumericArray} points
 * @return {string}
 */
export function pathFromPoints(points) {
  let cmd = `M ${points[0]} ${points[1]}`;
  let px = NaN;
  let py = NaN;
  let cx = points[0];
  let cy = points[1];

  for (let i = 2; i < points.length; i += 2) {
    let x = points[i];
    let y = points[i + 1];

    if (!(x === px || y === py)) {
      cmd += ` ${cx} ${cy}`
      px = x;
      py = y;
    }

    cx = x;
    cy = y;
  }

  return cmd;
}

/**
 * Same as {@link pathFromPoints} but closes the path at the end.
 *
 * @param {NumericArray} points
 * @return {string}
 */
export function closedPathFromPoints(points) {
  return pathFromPoints(points) + "Z";
}
