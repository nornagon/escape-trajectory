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

/*
  Cohen-Sutherland line clipping algorithm
  from https://en.wikipedia.org/wiki/Cohen%E2%80%93Sutherland_algorithm
*/

export function cohenSutherlandLineClip(xmin, xmax, ymin, ymax, p0, p1) {
  const INSIDE = 0 // 0000
  const LEFT = 1   // 0001
  const RIGHT = 2  // 0010
  const BOTTOM = 4 // 0100
  const TOP = 8    // 1000

  function computeOutCode(x, y) {
    let code = INSIDE
    if (x < xmin) code |= LEFT
    else if (x > xmax) code |= RIGHT
    if (y < ymin) code |= BOTTOM
    else if (y > ymax) code |= TOP
    return code
  }

  let outcode0 = computeOutCode(p0.x, p0.y)
  let outcode1 = computeOutCode(p1.x, p1.y)
  let accept = false

  while (true) {
    if (!(outcode0 | outcode1)) {
      // bitwise OR is 0: both points inside window; trivially accept and exit loop
      accept = true
      break
    } else if (outcode0 & outcode1) {
      // bitwise AND is not 0: both points share an outside zone (LEFT, RIGHT, TOP,
      // or BOTTOM), so both must be outside window; exit loop (accept is false)
      break
    } else {
      // failed both tests, so calculate the line segment to clip
      // from an outside point to an intersection with clip edge
      let x, y

      // At least one endpoint is outside the clip rectangle; pick it.
      const outcodeOut = outcode1 > outcode0 ? outcode1 : outcode0

      // Now find the intersection point;
      // use formulas:
      //   slope = (y1 - y0) / (x1 - x0)
      //   x = x0 + (1 / slope) * (ym - y0), where ym is ymin or ymax
      //   y = y0 + slope * (xm - x0), where xm is xmin or xmax
      // No need to worry about divide-by-zero because, in each case, the
      // outcode bit being tested guarantees the denominator is non-zero
      if (outcodeOut & TOP) {           // point is above the clip window
        x = p0.x + (p1.x - p0.x) * (ymax - p0.y) / (p1.y - p0.y)
        y = ymax
      } else if (outcodeOut & BOTTOM) { // point is below the clip window
        x = p0.x + (p1.x - p0.x) * (ymin - p0.y) / (p1.y - p0.y)
        y = ymin
      } else if (outcodeOut & RIGHT) {  // point is to the right of clip window
        y = p0.y + (p1.y - p0.y) * (xmax - p0.x) / (p1.x - p0.x)
        x = xmax
      } else if (outcodeOut & LEFT) {   // point is to the left of clip window
        y = p0.y + (p1.y - p0.y) * (xmin - p0.x) / (p1.x - p0.x)
        x = xmin
      }

      // Now we move outside point to intersection point to clip
      // and get ready for next pass.
      if (outcodeOut === outcode0) {
        p0.x = x
        p0.y = y
        outcode0 = computeOutCode(p0.x, p0.y)
      } else {
        p1.x = x
        p1.y = y
        outcode1 = computeOutCode(p1.x, p1.y)
      }
    }
  }
  return accept
}

export function bbIntersects(bb1, bb2) {
  return bb1.minX <= bb2.maxX && bb1.maxX >= bb2.minX && bb1.minY <= bb2.maxY && bb1.maxY >= bb2.minY && bb1.minT <= bb2.maxT && bb1.maxT >= bb2.minT
}
export function bbContains(bb1, p) {
  return p.x >= bb1.minX && p.x <= bb1.maxX && p.y >= bb1.minY && p.y <= bb1.maxY && p.t >= bb1.minT && p.t <= bb1.maxT
}

/** @typedef {{minX: number, maxX: number, minY: number, maxY: number, minT: number, maxT: number}} AABB */

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
    return this.#queryFirstHelper(bbTest)
  }
  #queryFirstHelper(bbTest, layer = this.#layers.length - 1, i = 0, j = 1) {
    for (; i < j && i < this.#layers[layer].length; i++) {
      const bb = this.#layers[layer][i]
      if (bbIntersects(bb, bbTest)) {
        if (layer === 0) {
          return bb
        } else {
          const bb = this.#queryFirstHelper(bbTest, layer - 1, i * 2, i * 2 + 2)
          if (bb) return bb
        }
      }
    }
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
