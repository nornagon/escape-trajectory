import { Ephemeris, Trajectory } from "./ephemeris.js"
import { cohenSutherlandLineClip } from "./geometry.js"

const celestials = [
  { name: "Sun", mass: 1.98855e30, position: {x: 0, y: 0}, velocity: {x: 0, y: 0}, radius: 695700e3, color: "#ff0" },

  { name: "Mercury", mass: 3.3011e23, position: {x: 5.791e10, y: 0}, velocity: {x: 0, y: 47.362e3}, radius: 2439.7e3, color: "#aaa" },

  { name: "Venus", mass: 4.8675e24, position: {x: 1.0821e11, y: 0}, velocity: {x: 0, y: 35.02e3}, radius: 6051.8e3, color: "#ac8657" },

  { name: "Earth", mass: 5.97237e24, position: {x: 1.496e11, y: 0}, velocity: {x: 0, y: 29.78e3}, radius: 6371e3, color: "#00f" },

  { name: "Moon", mass: 7.34767309e22, position: {x: 1.496e11 + 3.844e8, y: 0}, velocity: {x: 0, y: 29.78e3 + 1022}, radius: 1737.4e3, color: "#ccc" },

  { name: "Mars", mass: 6.4171e23, position: {x: 2.2794e11, y: 0}, velocity: {x: 0, y: 24.077e3}, radius: 3389.5e3, color: "#f00" },

    { name: "Phobos", mass: 1.0659e16, position: {x: 2.2794e11 + 9.376e6, y: 0}, velocity: {x: 0, y: 24.077e3 + 2.138e3}, radius: 11.2667e3, color: "#f00" },
    { name: "Deimos", mass: 1.4762e15, position: {x: 2.2794e11 + 2.326e7, y: 0}, velocity: {x: 0, y: 24.077e3 + 1.351e3}, radius: 6.2e3, color: "#f00" },

  { name: "Jupiter", mass: 1.8986e27, position: {x: 7.7857e11, y: 0}, velocity: {x: 0, y: 13.07e3}, radius: 69911e3, color: "#f0f" },

    { name: "Callisto", mass: 1.075938e23, position: {x: 7.7857e11 + 1.883e9, y: 0}, velocity: {x: 0, y: 13.07e3 + 8204}, radius: 2410e3, color: "#f0f" },
    { name: "Io", mass: 8.931938e22, position: {x: 7.7857e11 + 4.21e8, y: 0}, velocity: {x: 0, y: 13.07e3 + 17200}, radius: 1821.6e3, color: "#f0f" },
    { name: "Europa", mass: 4.799844e22, position: {x: 7.7857e11 + 6.71e8, y: 0}, velocity: {x: 0, y: 13.07e3 + 13700}, radius: 1560.8e3, color: "#f0f" },
    { name: "Ganymede", mass: 1.4819e23, position: {x: 7.7857e11 + 1.07e9, y: 0}, velocity: {x: 0, y: 13.07e3 + 10800}, radius: 2634.1e3, color: "#f0f" },

  { name: "Saturn", mass: 5.6834e26, position: {x: 1.4335e12, y: 0}, velocity: {x: 0, y: 9.69e3}, radius: 58232e3, color: "#f0f" },

  { name: "Uranus", mass: 8.6810e25, position: {x: 2.8735e12, y: 0}, velocity: {x: 0, y: 6.81e3}, radius: 25362e3, color: "#f0f" },

  { name: "Neptune", mass: 1.0243e26, position: {x: 4.4951e12, y: 0}, velocity: {x: 0, y: 5.43e3}, radius: 24622e3, color: "#f0f" },

  { name: "Pluto", mass: 1.303e22, position: {x: 5.9064e12, y: 0}, velocity: {x: 0, y: 4.74e3}, radius: 1188.3e3, color: "#f0f" },

  { name: "Ceres", mass: 9.393e20, position: {x: 4.14e11, y: 0}, velocity: {x: 0, y: 17.9e3}, radius: 469.73e3, color: "#f0f" },
]

const vadd = (a, b) => ({x: a.x + b.x, y: a.y + b.y})
const vsub = (a, b) => ({x: a.x - b.x, y: a.y - b.y})
const vscale = (v, s) => ({x: v.x * s, y: v.y * s})
const vdot = (a, b) => a.x * b.x + a.y * b.y
const vlen = v => Math.hypot(v.x, v.y)
const vnormalize = v => vscale(v, 1 / vlen(v))
const vrotate = (v, a) => ({
  x: v.x * Math.cos(a) - v.y * Math.sin(a),
  y: v.x * Math.sin(a) + v.y * Math.cos(a),
})
const vproject = (a, b) => vscale(b, vdot(a, b) / vlen(b))
const earth = celestials.find(c => c.name === 'Earth')
const G = 6.67408e-11
function orbitalVelocity(m1, m2, r) {
  return Math.sqrt(G * (m1 + m2) / r)
}
function initialState(parentBody, r, t = 0) {
  const v = orbitalVelocity(parentBody.mass, 0, r)
  return {
    position: vadd(parentBody.position, { x: r * Math.cos(t), y: r * Math.sin(t) }),
    velocity: vadd(parentBody.velocity, { x: 0, y: v }),
  }
}

/// WORLD STATE
const vessels = [
  {
    name: "Vessel 1",
    trajectory: new Trajectory(0, 0, initialState(earth, 200e3 + earth.radius)),
    color: "#0f0"
  },
  {
    name: "Vessel 2",
    trajectory: new Trajectory(0, 0, initialState(earth, 400e3 + earth.radius)),
    color: "#0f0"
  }
]

const ephemeris = new Ephemeris({
  bodies: celestials,
  time: 0,
  step: 1 * 60,
  tolerance: 1e-3,
})
window.ephemeris = ephemeris

/// UI STATE

let pan = {x: 0, y: 0}
let zoom = 38e3

let originBodyIndex = 3

let trajectoryHoverPoint = null
let trajectoryPoint = null

let draggingTrajectory = false
let draggingTrajectoryLen = 0

/// SETUP
//ephemeris.prolong(365.25 * 24 * 60 * 60)
ephemeris.prolong(1 * 60 * 60)
vessels.forEach(v => {
  ephemeris.flow(v.trajectory, ephemeris.tMax)
})

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("canvas")
canvas.width = window.innerWidth
canvas.height = window.innerHeight - 200
canvas.style.background = 'black'

const ctx = canvas.getContext("2d")

function defaultWheelDelta(event) {
  return -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002) * (event.ctrlKey ? 10 : 1);
}

canvas.addEventListener("wheel", event => {
  event.preventDefault()

  const wheelDelta = defaultWheelDelta(event)

  const x = event.offsetX - canvas.width / 2 - pan.x
  const y = event.offsetY - canvas.height / 2 - pan.y

  const k = Math.pow(2, wheelDelta)

  pan.x = event.offsetX - canvas.width / 2 - x * k
  pan.y = event.offsetY - canvas.height / 2 - y * k

  zoom *= k

  requestDraw()
})

function findNearestTrajectory({x, y}) {
  const tMax = ephemeris.tMax
  let closestP = 0
  let closestD = Infinity
  let closestI = -1
  vessels.forEach((vessel, i) => {
    // Find the closest point on |trajectory|
    for (const point of trajectoryPoints(vessel.trajectory, 0, tMax)) {
      const p = worldToScreenWithoutOrigin(point)
      const d = Math.hypot(p.x - x, p.y - y)
      if (d < closestD) {
        closestD = d
        closestP = point
        closestI = i
      }
    }
  })
  if (closestD < 10)
    return {
      i: closestI,
      t: closestP.t,
    }
}

class InteractionContext2D {
  #paths = []
  #currentPath = null
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

  stroke() {
  }

  fill() {
  }

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

  getPathForPoint({x, y}) {
    // Go backwards through the paths so we hit the topmost one first.
    for (let i = this.#paths.length - 1; i >= 0; i--) {
      const path = this.#paths[i]
      if (this.#ctx.isPointInPath(path, x, y))
        return path
    }
  }
}

canvas.addEventListener("mousedown", event => {
  event.preventDefault()

  const interactions = new InteractionContext2D(ctx)
  drawUI(interactions)
  const path = interactions.getPathForPoint({x: event.offsetX, y: event.offsetY})
  path?.mousedown?.(event)
  if (path) return

  const x0 = event.offsetX - canvas.width / 2 - pan.x
  const y0 = event.offsetY - canvas.height / 2 - pan.y

  for (const body of ephemeris.bodies) {
    const screenPos = worldToScreen(body.position)

    const dx = screenPos.x - event.offsetX
    const dy = screenPos.y - event.offsetY
    const r = Math.sqrt(dx * dx + dy * dy)
    if (r < 10) {
      originBodyIndex = ephemeris.bodies.indexOf(body)
      pan.x = 0
      pan.y = 0

      requestDraw()
      return
    }
  }

  let dragged = false
  function mousemove(event) {
    pan.x = event.offsetX - canvas.width / 2 - x0
    pan.y = event.offsetY - canvas.height / 2 - y0
    dragged = true

    requestDraw()
  }

  function mouseup(event) {
    canvas.removeEventListener("mousemove", mousemove)
    window.removeEventListener("mouseup", mouseup)
    window.removeEventListener("blur", mouseup)
    if (!dragged) {
      const point = findNearestTrajectory(event)
      trajectoryPoint = point
      requestDraw()
    }
  }

  canvas.addEventListener("mousemove", mousemove)
  window.addEventListener("mouseup", mouseup)
  window.addEventListener("blur", mouseup)
})

canvas.addEventListener("mousemove", event => {
  /*
  const point = findNearestTrajectory(event)
  trajectoryHoverPoint = point
  */
  const interactions = new InteractionContext2D(ctx)
  drawUI(interactions)
  const path = interactions.getPathForPoint({x: event.offsetX, y: event.offsetY})
  path?.mousemove?.(event)

  requestDraw()
})

canvas.addEventListener("mouseup", event => {
  const interactions = new InteractionContext2D(ctx)
  drawUI(interactions)
  const path = interactions.getPathForPoint({x: event.offsetX, y: event.offsetY})
  path?.mouseup?.(event)

  requestDraw()
})


function worldToScreen(pos) {
  const originBody = ephemeris.bodies[originBodyIndex]
  return {
    x: (pos.x - originBody.position.x) / 1e9 * zoom + canvas.width / 2 + pan.x,
    y: (pos.y - originBody.position.y) / 1e9 * zoom + canvas.height / 2 + pan.y,
  }
}
// This version doesn't subtract the origin body's position, so it can be used
// when drawing trajectories.
function worldToScreenWithoutOrigin(pos) {
  return {
    x: pos.x / 1e9 * zoom + canvas.width / 2 + pan.x,
    y: pos.y / 1e9 * zoom + canvas.height / 2 + pan.y,
  }
}

function clipLine(p1, p2) {
  const { width, height } = canvas
  return cohenSutherlandLineClip(
    0, width, 0, height,
    p1.x / 1e9 * zoom + width / 2 + pan.x,
    p1.y / 1e9 * zoom + height / 2 + pan.y,
    p2.x / 1e9 * zoom + width / 2 + pan.x,
    p2.y / 1e9 * zoom + height / 2 + pan.y,
  )
}

function clipPoint(p) {
  const { width, height } = canvas
  const sx = p.x / 1e9 * zoom + width / 2 + pan.x
  const sy = p.y / 1e9 * zoom + height / 2 + pan.y
  return sx >= 0 && sx < width && sy >= 0 && sy < height
}

function trajectoryPosInFrame(trajectory, t) {
  const originBodyTrajectory = ephemeris.trajectories[originBodyIndex]
  const q = trajectory.evaluatePosition(t)
  const originQ = originBodyTrajectory.evaluatePosition(t)

  return {
    x: q.x - originQ.x,
    y: q.y - originQ.y,
    t,
  }
}

function* trajectorySegment(trajectory, t0, t1) {
  const minSubdivisionDistance = 1e9/zoom * 10

  const p0 = trajectoryPosInFrame(trajectory, t0)
  const p1 = trajectoryPosInFrame(trajectory, t1)

  if (clipLine(p0, p1) && Math.hypot(p1.x - p0.x, p1.y - p0.y) > minSubdivisionDistance) {
    const tMid = (t0 + t1) / 2
    yield* trajectorySegment(trajectory, t0, tMid)
    yield* trajectorySegment(trajectory, tMid, t1)
  } else {
    yield p0
  }
}

function* trajectoryPoints(trajectory, t0, t1, step = 100 * 60 * 8) {
  for (let t = t0; t < t1; t += step) {
    yield* trajectorySegment(trajectory, t, Math.min(t + step, t1))
  }

  yield trajectoryPosInFrame(trajectory, t1)
}

function polyline(ctx, generator) {
  let first = true
  for (const p of generator) {
    if (first) {
      ctx.moveTo(p.x, p.y)
      first = false
    } else {
      ctx.lineTo(p.x, p.y)
    }
  }
}

function polygon(ctx, c, n, r, startAngle = 0) {
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

/**
 * @param {CanvasRenderingContext2D} ctx
 */
function drawUI(ctx) {
  if (trajectoryPoint) {
    const vessel = vessels[trajectoryPoint.i]
    const q = vessel.trajectory.evaluatePosition(trajectoryPoint.t)
    const originQ = ephemeris.trajectories[originBodyIndex].evaluatePosition(trajectoryPoint.t)
    const screenPos = worldToScreenWithoutOrigin(vsub(q, originQ))

    ctx.strokeStyle = 'lightblue'
    ctx.fillStyle = 'black'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(screenPos.x, screenPos.y, 10, 0, 2 * Math.PI)
    ctx.fill()
    ctx.stroke()

    const v = vsub(
      vessel.trajectory.evaluateVelocity(trajectoryPoint.t),
      ephemeris.trajectories[originBodyIndex].evaluateVelocity(trajectoryPoint.t),
    )
    const len = draggingTrajectory ? draggingTrajectoryLen : 80
    const angle = 0
    const prograde = vnormalize(v)
    const normal = vrotate(prograde, angle)
    ctx.beginPath()
    ctx.moveTo(screenPos.x + normal.x * 10, screenPos.y + normal.y * 10)
    ctx.lineTo(screenPos.x + normal.x * len, screenPos.y + normal.y * len)
    ctx.stroke()

    ctx.fillStyle = '#0f0'
    ctx.strokeStyle = 'black'
    polygon(ctx, vadd(screenPos, vscale(normal, len)), 3, 10, -Math.PI / 2)
    ctx.stroke()
    ctx.fill()
    ctx.on?.('mousedown', () => {
      draggingTrajectory = true;
      draggingTrajectoryLen = 80
    })

    if (draggingTrajectory && ctx.on) {
      ctx.beginPath()
      ctx.rect(0, 0, canvas.width, canvas.height)
      ctx.on?.('mousemove', (e) => {
        const a = vdot(vsub(e, screenPos), normal)
        draggingTrajectoryLen = Math.min(160, Math.max(10, a))
      })
      ctx.on?.('mouseup', () => {
        draggingTrajectory = false
      })
    }
  } else if (trajectoryHoverPoint) {
    const vessel = vessels[trajectoryHoverPoint.i]
    const q = vessel.trajectory.evaluatePosition(trajectoryHoverPoint.t)
    const originQ = ephemeris.trajectories[originBodyIndex].evaluatePosition(trajectoryHoverPoint.t)
    const screenPos = worldToScreenWithoutOrigin(vsub(q, originQ))

    ctx.fillStyle = 'lightblue'
    ctx.beginPath()
    ctx.arc(screenPos.x, screenPos.y, 5, 0, 2 * Math.PI)
    ctx.fill()
  }
}

function draw() {
  const start = performance.now()
  ctx.save()
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw trajectories
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.lineWidth = 1

  const tMax = ephemeris.tMax
  for (const trajectory of ephemeris.trajectories) {
    ctx.save()
    ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y)
    ctx.scale(zoom/1e9, zoom/1e9)
    ctx.beginPath()
    polyline(ctx, trajectoryPoints(trajectory, 0, tMax))
    ctx.restore()
    ctx.stroke()
  }

  // Draw bodies
  for (let i = 0; i < ephemeris.bodies.length; i++) {
    const body = ephemeris.bodies[i]
    const trajectory = ephemeris.trajectories[i]
    ctx.fillStyle = body.color
    const pos = trajectory.evaluatePosition(tMax)
    const screenPos = worldToScreen(pos)
    ctx.beginPath()
    ctx.arc(screenPos.x, screenPos.y, Math.max(2, body.radius / 1e9 * zoom), 0, 2 * Math.PI)
    ctx.fill()

    ctx.fillStyle = 'white'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(body.name, 4 + screenPos.x, screenPos.y)
  }
  ctx.restore()

  // Draw vessel trajectories
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.lineWidth = 1
  for (const vessel of vessels) {
    ctx.save()
    ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y)
    ctx.scale(zoom/1e9, zoom/1e9)
    ctx.beginPath()
    polyline(ctx, trajectoryPoints(vessel.trajectory, 0, tMax))
    ctx.restore()
    ctx.stroke()
  }

  // Draw vessel
  for (const vessel of vessels) {
    const pos = vessel.trajectory.evaluatePosition(tMax)
    const screenPos = worldToScreen(pos)
    ctx.fillStyle = vessel.color
    ctx.beginPath()
    ctx.arc(screenPos.x, screenPos.y, 2, 0, 2 * Math.PI)
    ctx.fill()
  }

  ctx.restore()
  ctx.save()
  drawUI(ctx)
  ctx.restore()

  ctx.save()
  // Draw info
  ctx.fillStyle = 'white'
  //ctx.fillText("Total energy: " + totalEnergy(bodies).toExponential(4), 10, 20)
  const end = performance.now()
  const drawTime = end - start
  document.querySelector('#draw-time').textContent = drawTime.toFixed(2) + ' ms'
  document.querySelector('#zoom-level').textContent = zoom.toFixed(2) + 'x'
  document.querySelector('#t').textContent = tMax
  ctx.restore()
}

let raf = null
function requestDraw() {
  if (!raf) {
    raf = requestAnimationFrame(() => {
      raf = null
      draw()
    })
  }
}

step.onclick = () => {
  ephemeris.prolong(ephemeris.tMax + ephemeris.step)
  vessels.forEach(v => {
    ephemeris.flow(v.trajectory, ephemeris.tMax)
  })
  requestDraw()
}

step10.onclick = () => {
  ephemeris.prolong(ephemeris.tMax + ephemeris.step * 10)
  vessels.forEach(v => {
    ephemeris.flow(v.trajectory, ephemeris.tMax)
  })
  requestDraw()
}

step100.onclick = () => {
  ephemeris.prolong(ephemeris.tMax + ephemeris.step * 100)
  vessels.forEach(v => {
    ephemeris.flow(v.trajectory, ephemeris.tMax)
  })
  requestDraw()
}
draw()
