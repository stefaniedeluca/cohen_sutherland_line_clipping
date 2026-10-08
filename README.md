# Cohen-Sutherland Line Clipping

A small TypeScript-free, zero-dependency ESM library that computes the visible portion of a line segment against an axis-aligned rectangle using Cohen-Sutherland outcode region encoding.

## Usage

```js
import { clipLine, computeOutcode, LEFT, RIGHT, TOP, BOTTOM, INSIDE } from "./src/index.js";

const rect = { xmin: 0, ymin: 0, xmax: 100, ymax: 100 };
const visible = clipLine(-20, 50, 120, 50, rect.xmin, rect.ymin, rect.xmax, rect.ymax);
// visible === { x0: 0, y0: 50, x1: 100, y1: 50 }

const code = computeOutcode(-20, 50, rect.xmin, rect.ymin, rect.xmax, rect.ymax);
// code === LEFT (1)
```

`clipLine(x0, y0, x1, y1, xmin, ymin, xmax, ymax)` returns `{ x0, y0, x1, y1 }` for the clipped segment, or `null` if no part is visible. `computeOutcode(x, y, ...)` returns a bitwise combination of `INSIDE` (0), `LEFT` (1), `RIGHT` (2), `BOTTOM` (4), `TOP` (8).

## Why this exists

Cohen-Sutherland is the standard answer when you need to clip many line segments to one rectangle and want trivial accept/reject to dominate: most segments are either fully inside or fully outside, and the outcode bitmask lets both cases be a single bitwise test. The trade-off is that it trims iteratively, one edge at a time, so it is not the tightest possible single-segment clipper — it wins on volume, not on per-call cost.

## Edge cases worth knowing

The rectangle is the **closed** region `[xmin, xmax] × [ymin, ymax]`: points on the boundary are inside, so a segment lying along an edge is returned as-is rather than trimmed away. Degenerate zero-length segments are handled explicitly before the main loop, because the algorithm's slope computation would otherwise be undefined for `dx = dy = 0`. Vertical and horizontal segments use a sentinel infinite slope so the standard intersection formulas don't divide by zero.
