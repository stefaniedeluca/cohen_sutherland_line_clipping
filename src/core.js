/**
 * Cohen-Sutherland line clipping.
 *
 * We clip a line segment against an axis-aligned rectangle by encoding each
 * endpoint's position relative to the rectangle as a 4-bit outcode, then
 * trivially accept (both zero) or reject (AND non-zero), and otherwise
 * iteratively trim whichever endpoint is outside. Integer bit flags are used
 * because they let accept/reject be a single bitwise test, which is the whole
 * point of the algorithm.
 */

/**
 * Outcode bit flags. A point is classified by OR-ing whichever region(s) it
 * lies in. LEFT and RIGHT, and TOP and BOTTOM, are mutually exclusive for any
 * real point, but we don't rely on that — we just test the bits.
 */
export const INSIDE = 0;
export const LEFT = 1;
export const RIGHT = 2;
export const BOTTOM = 4;
export const TOP = 8;

/**
 * Compute the outcode of a point (x, y) against the rectangle.
 *
 * Rectangle edges are treated as inside: a point on the boundary gets INSIDE.
 * This keeps a segment whose endpoint lies exactly on an edge from being
 * flagged outside, which would cause a spurious trim and a visible one-pixel
 * shortening.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} xmin
 * @param {number} ymin
 * @param {number} xmax
 * @param {number} ymax
 * @returns {number} bitwise OR of the relevant region flags
 */
export function computeOutcode(x, y, xmin, ymin, xmax, ymax) {
  let code = INSIDE;
  if (x < xmin) {
    code |= LEFT;
  } else if (x > xmax) {
    code |= RIGHT;
  }
  if (y < ymin) {
    code |= BOTTOM;
  } else if (y > ymax) {
    code |= TOP;
  }
  return code;
}

/**
 * Clip a line segment to an axis-aligned rectangle using Cohen-Sutherland.
 *
 * Returns the clipped segment, or null if no part of the segment is visible.
 *
 * Interpretation chosen (stated plainly): the rectangle is the closed region
 * [xmin, xmax] × [ymin, ymax]. A segment lying entirely on the boundary (e.g.
 * along an edge) is visible and returned as-is. Degenerate zero-length
 * segments are handled: an endpoint inside returns that point, one outside
 * returns null.
 *
 * The slope is computed lazily and a zero dx (vertical) or zero dy
 * (horizontal) is special-cased with Infinity so the standard intersection
 * formulas don't divide by zero. We never actually divide by the slope when
 * it's infinite because the corresponding outcode branch won't fire.
 *
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 * @param {number} xmin
 * @param {number} ymin
 * @param {number} xmax
 * @param {number} ymax
 * @returns {{x0: number, y0: number, x1: number, y1: number} | null}
 */
export function clipLine(x0, y0, x1, y1, xmin, ymin, xmax, ymax) {
  let cx0 = x0;
  let cy0 = y0;
  let cx1 = x1;
  let cy1 = y1;

  let code0 = computeOutcode(cx0, cy0, xmin, ymin, xmax, ymax);
  let code1 = computeOutcode(cx1, cy1, xmin, ymin, xmax, ymax);

  // The original algorithm assumes a non-degenerate segment. A zero-length
  // segment is visible iff its single point lies inside; handle that up front
  // so the main loop doesn't spin on an undefined slope.
  if (cx0 === cx1 && cy0 === cy1) {
    return code0 === INSIDE ? { x0: cx0, y0: cy0, x1: cx1, y1: cy1 } : null;
  }

  while (true) {
    // Trivial accept: both endpoints inside.
    if ((code0 | code1) === INSIDE) {
      return { x0: cx0, y0: cy0, x1: cx1, y1: cy1 };
    }
    // Trivial reject: both endpoints share a region bit.
    if ((code0 & code1) !== INSIDE) {
      return null;
    }

    // Pick the outside endpoint. Cohen-Sutherland only trims one at a time,
    // so we just take whichever has a non-zero code.
    const outsideCode = code0 !== INSIDE ? code0 : code1;
    let x, y;

    const dx = cx1 - cx0;
    const dy = cy1 - cy0;
    // Avoid division by zero; the matching branch below won't use the slope
    // in the zero case, so a sentinel Infinity is safe.
    const slope = dx === 0 ? Infinity : dy / dx;

    if (outsideCode & TOP) {
      x = cx0 + slope !== Infinity ? cx0 + (ymax - cy0) / slope : cx0;
      y = ymax;
    } else if (outsideCode & BOTTOM) {
      x = slope !== Infinity ? cx0 + (ymin - cy0) / slope : cx0;
      y = ymin;
    } else if (outsideCode & RIGHT) {
      y = cy0 + (xmax - cx0) * slope;
      x = xmax;
    } else if (outsideCode & LEFT) {
      y = cy0 + (xmin - cx0) * slope;
      x = xmin;
    }

    if (outsideCode === code0) {
      cx0 = x;
      cy0 = y;
      code0 = computeOutcode(cx0, cy0, xmin, ymin, xmax, ymax);
    } else {
      cx1 = x;
      cy1 = y;
      code1 = computeOutcode(cx1, cy1, xmin, ymin, xmax, ymax);
    }
  }
}
