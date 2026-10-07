import { test } from "node:test";
import assert from "node:assert/strict";
import { clipLine, computeOutcode, INSIDE, LEFT, RIGHT, BOTTOM, TOP } from "../src/index.js";

// Rectangle used across most tests.
const R = { xmin: 10, ymin: 10, xmax: 20, ymax: 20 };

// Helper: compare a result's coordinates to expected within a tight tolerance.
// We never use == on floats in tests.
function approxEqual(a, b, eps = 1e-9) {
  return Math.abs(a - b) <= eps;
}
function assertSegmentEqual(actual, expected, eps = 1e-9) {
  assert.ok(actual !== null, "expected a visible segment, got null");
  assert.ok(approxEqual(actual.x0, expected.x0, eps), `x0: ${actual.x0} vs ${expected.x0}`);
  assert.ok(approxEqual(actual.y0, expected.y0, eps), `y0: ${actual.y0} vs ${expected.y0}`);
  assert.ok(approxEqual(actual.x1, expected.x1, eps), `x1: ${actual.x1} vs ${expected.x1}`);
  assert.ok(approxEqual(actual.y1, expected.y1, eps), `y1: ${actual.y1} vs ${expected.y1}`);
}

test("computeOutcode classifies points relative to the rectangle", () => {
  assert.equal(computeOutcode(15, 15, 10, 10, 20, 20), INSIDE);
  assert.equal(computeOutcode(5, 15, 10, 10, 20, 20), LEFT);
  assert.equal(computeOutcode(25, 15, 10, 10, 20, 20), RIGHT);
  assert.equal(computeOutcode(15, 5, 10, 10, 20, 20), BOTTOM);
  assert.equal(computeOutcode(15, 25, 10, 10, 20, 20), TOP);
  // Corner regions set two bits.
  assert.equal(computeOutcode(5, 5, 10, 10, 20, 20), LEFT | BOTTOM);
  assert.equal(computeOutcode(25, 25, 10, 10, 20, 20), RIGHT | TOP);
  assert.equal(computeOutcode(5, 25, 10, 10, 20, 20), LEFT | TOP);
  assert.equal(computeOutcode(25, 5, 10, 10, 20, 20), RIGHT | BOTTOM);
});

test("computeOutcode treats boundary points as inside", () => {
  assert.equal(computeOutcode(10, 15, 10, 10, 20, 20), INSIDE);
  assert.equal(computeOutcode(20, 15, 10, 10, 20, 20), INSIDE);
  assert.equal(computeOutcode(15, 10, 10, 10, 20, 20), INSIDE);
  assert.equal(computeOutcode(15, 20, 10, 10, 20, 20), INSIDE);
  assert.equal(computeOutcode(10, 10, 10, 10, 20, 20), INSIDE);
  assert.equal(computeOutcode(20, 20, 10, 10, 20, 20), INSIDE);
});

test("fully inside segment is returned unchanged", () => {
  const r = clipLine(12, 12, 18, 18, R.xmin, R.ymin, R.xmax, R.ymax);
  assertSegmentEqual(r, { x0: 12, y0: 12, x1: 18, y1: 18 });
});

test("fully outside segment with no shared region is rejected", () => {
  // Left of rect going to above rect — endpoints in different regions, but
  // the line passes nowhere near the rectangle. The algorithm should reject.
  const r = clipLine(0, 0, 5, 25, R.xmin, R.ymin, R.xmax, R.ymax);
  assert.equal(r, null);
});

test("fully outside segment sharing a region is rejected", () => {
  // Both endpoints left of the rectangle.
  const r = clipLine(0, 5, 5, 25, R.xmin, R.ymin, R.xmax, R.ymax);
  assert.equal(r, null);
});

test("segment crossing horizontally is trimmed at left and right edges", () => {
  const r = clipLine(0, 15, 30, 15, R.xmin, R.ymin, R.xmax, R.ymax);
  assertSegmentEqual(r, { x0: 10, y0: 15, x1: 20, y1: 15 });
});

test("segment crossing vertically is trimmed at bottom and top edges", () => {
  const r = clipLine(15, 0, 15, 30, R.xmin, R.ymin, R.xmax, R.ymax);
  assertSegmentEqual(r, { x0: 15, y0: 10, x1: 15, y1: 20 });
});

test("diagonal segment from outside to outside is trimmed at two edges", () => {
  // From bottom-left region to top-right region, through the centre.
  const r = clipLine(0, 0, 30, 30, R.xmin, R.ymin, R.xmax, R.ymax);
  assertSegmentEqual(r, { x0: 10, y0: 10, x1: 20, y1: 20 });
});

test("one endpoint inside, one outside, is trimmed once", () => {
  const r = clipLine(15, 15, 30, 15, R.xmin, R.ymin, R.xmax, R.ymax);
  assertSegmentEqual(r, { x0: 15, y0: 15, x1: 20, y1: 15 });
});

test("vertical segment outside horizontally is rejected", () => {
  const r = clipLine(5, 0, 5, 30, R.xmin, R.ymin, R.xmax, R.ymax);
  assert.equal(r, null);
});

test("horizontal segment outside vertically is rejected", () => {
  const r = clipLine(0, 5, 30, 5, R.xmin, R.ymin, R.xmax, R.ymax);
  assert.equal(r, null);
});

test("segment lying exactly on the bottom edge is visible", () => {
  const r = clipLine(12, 10, 18, 10, R.xmin, R.ymin, R.xmax, R.ymax);
  assertSegmentEqual(r, { x0: 12, y0: 10, x1: 18, y1: 10 });
});

test("segment lying exactly on the left edge is visible", () => {
  const r = clipLine(10, 12, 10, 18, R.xmin, R.ymin, R.xmax, R.ymax);
  assertSegmentEqual(r, { x0: 10, y0: 12, x1: 10, y1: 18 });
});

test("degenerate zero-length segment inside is visible", () => {
  const r = clipLine(15, 15, 15, 15, R.xmin, R.ymin, R.xmax, R.ymax);
  assertSegmentEqual(r, { x0: 15, y0: 15, x1: 15, y1: 15 });
});

test("degenerate zero-length segment outside is rejected", () => {
  const r = clipLine(5, 5, 5, 5, R.xmin, R.ymin, R.xmax, R.ymax);
  assert.equal(r, null);
});

test("degenerate zero-length segment on the boundary is visible", () => {
  const r = clipLine(10, 10, 10, 10, R.xmin, R.ymin, R.xmax, R.ymax);
  assertSegmentEqual(r, { x0: 10, y0: 10, x1: 10, y1: 10 });
});

test("endpoint on a corner is treated as inside and not trimmed", () => {
  // From the bottom-left corner outward to the right; the corner stays.
  const r = clipLine(10, 10, 30, 10, R.xmin, R.ymin, R.xmax, R.ymax);
  assertSegmentEqual(r, { x0: 10, y0: 10, x1: 20, y1: 10 });
});
