// @ts-check

/** @typedef { import("./types").Vec2 } Vec2 */

/** @type { import("./types").Ops<Vec2> } */
export const vops = {
  add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y }
  },
  addi(a, b) {
    a.x += b.x
    a.y += b.y
    return a;
  },
  sub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y }
  },
  subi(a, b) {
    a.x -= b.x
    a.y -= b.y
    return a;
  },
  scale(a, s) {
    return { x: a.x * s, y: a.y * s }
  },
  scalei(a, s) {
    a.x *= s
    a.y *= s
    return a;
  },
  norm(a) {
    return Math.hypot(a.x, a.y)
  },
  norm2(a) {
    return a.x * a.x + a.y * a.y
  },
  dot(a, b) { return a.x * b.x + a.y * b.y },
  neg(a) { return { x: -a.x, y: -a.y } },
  len(a) { return Math.hypot(a.x, a.y) },
  normalize(a) { return vops.scale(a, 1 / vops.len(a)) },
  perp(a) { return { x: -a.y, y: a.x } },
  rotate(a, angle) {
    return {
      x: a.x * Math.cos(angle) - a.y * Math.sin(angle),
      y: a.x * Math.sin(angle) + a.y * Math.cos(angle),
    }
  },
  project(a, b) { return vops.scale(b, vops.dot(a, b) / vops.len(b)) },
  lerp(a, b, t) {
    if (t === 0) return a
    if (t === 1) return b
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
  },
  get zero() { return { x: 0, y: 0 } },
}

/**
 * Liang-Barsky function by Daniel White
 *
 * @link http://www.skytopia.com/project/articles/compsci/clipping.html
 *
 * @param {number} xmin
 * @param {number} xmax
 * @param {number} ymin
 * @param {number} ymax
 * @param {{ x: number; y: number; }} p0
 * @param {{ x: number; y: number; }} p1
 */
export function liangBarskyLineClip (xmin, xmax, ymin, ymax, p0, p1) {
  const {x: x0, y: y0} = p0
  const {x: x1, y: y1} = p1
  let t0 = 0, t1 = 1;
  const dx = x1 - x0, dy = y1 - y0;
  for (let edge = 0; edge < 4; edge++) {
    let p = NaN, q = NaN;

    if (edge === 0) { p = -dx; q = -(xmin - x0); }
    if (edge === 1) { p = dx; q = (xmax - x0); }
    if (edge === 2) { p = -dy; q = -(ymin - y0); }
    if (edge === 3) { p = dy; q = (ymax - y0); }

    const r = q / p;

    if (p === 0 && q < 0) return null;

    if (p < 0) {
      if (r > t1) return null;
      else if (r > t0) t0 = r;
    } else if (p > 0) {
      if (r < t0) return null;
      else if (r < t1) t1 = r;
    }
  }

  p0.x = x0 + t0 * dx;
  p0.y = y0 + t0 * dy;
  p1.x = x0 + t1 * dx;
  p1.y = y0 + t1 * dy;
  return [t0, t1]
}

/** @typedef {{minX: number, maxX: number, minY: number, maxY: number, minT: number, maxT: number}} AABB */

/**
 * @param {AABB} bb1
 * @param {AABB} bb2
 */
export function bbIntersects(bb1, bb2) {
  return bb1.minX <= bb2.maxX && bb1.maxX >= bb2.minX && bb1.minY <= bb2.maxY && bb1.maxY >= bb2.minY && bb1.minT <= bb2.maxT && bb1.maxT >= bb2.minT
}
/**
 * @param {AABB} bb
 * @param {Vec2 & {t: number}} p
 */
export function bbContains(bb, p) {
  return p.x >= bb.minX && p.x <= bb.maxX && p.y >= bb.minY && p.y <= bb.maxY && p.t >= bb.minT && p.t <= bb.maxT
}

export class BBTree {
  /** @type {Array<Array<AABB>>} */
  #layers = [[]]
  get length() {
    return this.#layers[0].length
  }
  get layers() { return this.#layers }

  get boundingBox() {
    return this.#layers[this.#layers.length - 1][0]
  }

  /** @param {AABB} bb */
  insert(bb) {
    if (this.#layers[0].length && bb.minT !== this.#layers[0][this.#layers[0].length - 1].maxT)
      throw new Error("BBTree: inserted bounding boxes must be in order of increasing time")
    let i = this.length
    let j = i << 1
    let layer = 0
    do {
      if (!this.#layers[layer])
        this.#layers[layer] = [this.#layers[layer - 1][i >> 1]]
      this.#layers[layer][i] = this.#merge(this.#layers[layer][i], bb)
      i >>= 1
      j >>= 1
      layer++
    } while (j)
  }

  /**
   * @param {AABB} a
   * @param {AABB} b
   */
  #merge(a, b) {
    if (!a) return b
    return {
      minX: Math.min(a.minX, b.minX),
      minY: Math.min(a.minY, b.minY),
      maxX: Math.max(a.maxX, b.maxX),
      maxY: Math.max(a.maxY, b.maxY),
      minT: Math.min(a.minT, b.minT),
      maxT: Math.max(a.maxT, b.maxT),
    }
  }

  /**
   * @param {AABB} bbTest The bounding box to test against.
   * @returns {AABB} The first bounding box that intersects with `bbTest`, or `undefined` if none do.
   */
  queryFirst(bbTest) {
    const queryFirstHelper = (layer = this.#layers.length - 1, i = 0, j = 1) => {
      for (; i < j && i < this.#layers[layer].length; i++) {
        const bb = this.#layers[layer][i]
        if (bbIntersects(bb, bbTest)) {
          if (layer === 0) {
            return bb
          } else {
            const bb = queryFirstHelper(layer - 1, i * 2, i * 2 + 2)
            if (bb) return bb
          }
        }
      }
    }
    return queryFirstHelper()
  }
}

/**
 * Find the closest point on a segment to a given point
 * @param {Vec2} p1
 * @param {Vec2} p2
 * @param {Vec2} param2
 * @returns
 */
export function closestTOnSegment(p1, p2, {x: x0, y: y0}) {
  const {x: x1, y: y1} = p1
  const {x: x2, y: y2} = p2
  const dx = x2 - x1
  const dy = y2 - y1
  const d2 = dx * dx + dy * dy
  if (d2 === 0)
    return 0
  const t = ((x0 - x1) * dx + (y0 - y1) * dy) / d2
  return Math.max(0, Math.min(1, t))
}
/**
 * @param {number} a
 * @param {number} b
 * @param {number} t
 * @returns
 */
export function lerp(a, b, t) {
  return a + (b - a) * t
}
export function closestPointOnSegment(p1, p2, s) {
  return vops.lerp(p1, p2, closestTOnSegment(p1, p2, s))
}
