// @ts-check

export function polyline(ctx, generator) {
  let first = true
  let n = 0
  for (const p of generator) {
    if (first) {
      ctx.moveTo(p.x, p.y)
      first = false
    } else {
      ctx.lineTo(p.x, p.y)
    }
    n++
  }
  console.log(`polyline: ${n} points`)
}

export function polygon(ctx, c, n, r, startAngle = 0) {
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const angle = i * 2 * Math.PI / n + startAngle
    if (i === 0)
      ctx.moveTo(c.x + r * Math.cos(angle), c.y + r * Math.sin(angle))
    else
      ctx.lineTo(c.x + r * Math.cos(angle), c.y + r * Math.sin(angle))
  }
  ctx.closePath()
}

export class InteractionContext2D {
  /** @type {Array<Path2D>} */
  #paths = []
  /** @type {Path2D} */
  #currentPath
  #ctx

  constructor(ctx) {
    this.#ctx = ctx
  }

  beginPath() {
    this.#currentPath = new Path2D()
    this.#paths.push(this.#currentPath)
  }

  moveTo(x, y) {
    this.#currentPath.moveTo(x, y)
  }

  lineTo(x, y) {
    this.#currentPath.lineTo(x, y)
  }

  rect(x, y, w, h) {
    this.#currentPath.rect(x, y, w, h)
  }

  arc(x, y, r, a0, a1) {
    this.#currentPath.arc(x, y, r, a0, a1)
  }

  stroke() {}

  fill() {}

  fillText() {}

  closePath() {
    this.#currentPath.closePath()
  }

  set fillStyle(style) {
  }

  set strokeStyle(style) {
  }

  set lineWidth(width) {
  }

  on(event, handler) {
    this.#currentPath[event] = handler
  }

  *pathsAtPoint({x, y}) {
    // Go backwards through the paths so we hit the topmost one first.
    for (let i = this.#paths.length - 1; i >= 0; i--) {
      const path = this.#paths[i]
      if (this.#ctx.isPointInPath(path, x, y))
        yield path
    }
  }
}
