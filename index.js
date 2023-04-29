import { Ephemeris, Trajectory } from "./ephemeris.js"
import { cohenSutherlandLineClip } from "./geometry.js"

// Format the given duration as Wd Xh Ym Zs, where W=days, X=hours, Y=minutes, Z=seconds
// If days is 0, omit it. If hours is 0, omit it. If minutes is 0, omit it.
function formatDuration(seconds) {
  let days = Math.floor(seconds / 86400)
  let hours = Math.floor((seconds % 86400) / 3600)
  let minutes = Math.floor((seconds % 3600) / 60)
  let seconds2 = Math.floor(seconds % 60)
  let result = ""
  if (days > 0) result += `${days}d `
  if (hours > 0) result += `${hours}h `
  if (minutes > 0) result += `${minutes}m `
  result += `${seconds2}s`
  return result
}

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
const vneg = v => ({x: -v.x, y: -v.y})
const vlen = v => Math.hypot(v.x, v.y)
const vnormalize = v => vscale(v, 1 / vlen(v))
const vperp = v => ({x: -v.y, y: v.x})
const vrotate = (v, a) => ({
  x: v.x * Math.cos(a) - v.y * Math.sin(a),
  y: v.x * Math.sin(a) + v.y * Math.cos(a),
})
const vproject = (a, b) => vscale(b, vdot(a, b) / vlen(b))
function vlerp(p1, p2, t) {
  if (t === 0) return p1
  if (t === 1) return p2
  return {x: lerp(p1.x, p2.x, t), y: lerp(p1.y, p2.y, t)}
}
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

class Maneuver {
  #startTime
  #duration
  #initialMass
  #direction
  #initialDirection

  constructor({ startTime, duration, direction, initialMass }) {
    this.#startTime = startTime
    this.#duration = duration
    this.#direction = vnormalize(direction)
    this.#initialDirection = this.#direction
    this.#initialMass = initialMass
  }

  get startTime() { return this.#startTime }
  get duration() { return this.#duration }
  set duration(d) { this.#duration = d }
  get direction() { return this.#direction }
  set direction(d) { this.#direction = vnormalize(d) }
  get initialDirection() { return this.#initialDirection }
  get endTime() { return this.#startTime + this.#duration }

  inertialIntrinsicAcceleration(t) {
    return this.#computeIntrinsicAcceleration(t, this.#direction)
  }

  #computeIntrinsicAcceleration(t, direction) {
    if (t >= this.#startTime && t <= this.#startTime + this.#duration) {
      const thrust = 1000000 // Newtons
      // TODO: assume zero mass flow rate for now
      return vscale(direction, thrust / this.#initialMass)
    }
    return { x: 0, y: 0 }
  }
}

class Vessel {
  #name
  #mass
  #trajectory
  #color
  #maneuvers = []
  constructor({ name, mass, initialState, color }) {
    this.#name = name
    this.#mass = mass
    this.#trajectory = new Trajectory(initialState)
    this.#color = color
  }

  get name() { return this.#name }
  get mass() { return this.#mass }
  get trajectory() { return this.#trajectory }
  get color() { return this.#color }
  get maneuvers() { return this.#maneuvers }

  intrinsicAcceleration(t) {
    const a = { x: 0, y: 0 }
    for (const maneuver of this.#maneuvers) {
      const ma = maneuver.inertialIntrinsicAcceleration(t)
      a.x += ma.x
      a.y += ma.y
    }
    return a
  }

  addManeuver(t0, duration, direction) {
    this.#maneuvers.push(new Maneuver({
      startTime: t0,
      duration,
      direction,
      initialMass: this.#mass,
    }))
    return this.#maneuvers[this.#maneuvers.length - 1]
  }

  removeManeuver(maneuver) {
    const i = this.#maneuvers.indexOf(maneuver)
    if (i >= 0)
      this.#maneuvers.splice(i, 1)
    else throw new Error('maneuver not in vessel')
  }
}

const Second = 1
const Minute = 60 * Second
const Hour = 60 * Minute
const Day = 24 * Hour
const Month = 30 * Day

/// WORLD STATE
const vessels = [
  new Vessel({
    name: "Lil Rocket Guy",
    mass: 50e3,
    initialState: initialState(earth, 200e3 + earth.radius),
    color: "#0f0",
  }),
  /*
  new Vessel({
    name: "ISS",
    mass: 420e3,
    initialState: initialState(earth, 400e3 + earth.radius),
    color: "#0f0",
  })
  */
]

const ephemeris = new Ephemeris({
  bodies: celestials,
  time: 0,
  step: 1 * 60,
  tolerance: 1e-3,
})
window.ephemeris = ephemeris

let currentTime = 0

let trajectoryBBTrees = new WeakMap

function simUntil(t) {
  const tMax = ephemeris.tMax
  if (t + 14 * Day > tMax) {
    ephemeris.prolong(t + 14 * Day)
    trajectoryBBTrees = new WeakMap
  }
  vessels.forEach(v => {
    for (const m of v.maneuvers) {
      const lastSimulatedTime = v.trajectory.tMax
      if (m.startTime < lastSimulatedTime)
        continue
      // Coast until maneuver start
      ephemeris.flowWithAdaptiveStep(v.trajectory, m.startTime)
      // Burn until maneuver end
      ephemeris.flowWithAdaptiveStep(v.trajectory, m.endTime, v.intrinsicAcceleration.bind(v))
    }
    // Coast until tMax
    ephemeris.flowWithAdaptiveStep(v.trajectory, ephemeris.tMax)
  })
  currentTime = t
}

/// UI STATE

let mouse = {x: 0, y: 0}

let pan = {x: 0, y: 0}
let zoom = 38e3

let originBodyIndex = 3

let trajectoryHoverPoint = null
let currentManeuver = null
let maneuverVessel = null

let draggingManeuver = null
let draggingManeuverLen = 0

/// SETUP
simUntil(currentTime)

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("canvas")
canvas.width = window.innerWidth
canvas.height = window.innerHeight - 200
canvas.style.background = 'black'

const ctx = canvas.getContext("2d", { alpha: false })

function defaultWheelDelta(event) {
  return -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002) * (event.ctrlKey ? 10 : 1);
}

canvas.addEventListener("wheel", event => {
  event.preventDefault()

  const wheelDelta = defaultWheelDelta(event)

  const x = event.offsetX - canvas.width / 2 - pan.x
  const y = event.offsetY - canvas.height / 2 - pan.y

  let k = Math.pow(2, wheelDelta)
  let oldZoom = zoom
  zoom *= k
  zoom = Math.min(zoom, 1e9)
  k = zoom / oldZoom

  pan.x = event.offsetX - canvas.width / 2 - x * k
  pan.y = event.offsetY - canvas.height / 2 - y * k

  requestDraw()
})

// Find the closest point on a segment to a given point
function closestTOnSegment(p1, p2, {x: x0, y: y0}) {
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
function lerp(a, b, t) {
  return a + (b - a) * t
}
function closestPointOnSegment(p1, p2, s) {
  return vlerp(p1, p2, closestTOnSegment(p1, p2, s))
}

function findNearestTrajectory(screenPos) {
  const {x, y} = screenPos
  let closestP = null
  let closestD = Infinity
  let closestI = -1
  vessels.forEach((vessel, i) => {
    // Find the closestPointpoint on |trajectory|
    for (const [a, b] of vessel.trajectory.segments()) {
      const aScreenPos = worldToScreen(a.position, a.time)
      const bScreenPos = worldToScreen(b.position, b.time)
      const t = closestTOnSegment(aScreenPos, bScreenPos, screenPos)
      const time = lerp(a.time, b.time, t)
      if (time >= currentTime) {
        const p = vlerp(aScreenPos, bScreenPos, t)
        p.t = time
        const d = Math.hypot(p.x - x, p.y - y)
        if (d < closestD) {
          closestD = d
          closestP = p
          closestI = i
        } else if (closestD < 10 && d > 10) {
          // If we've already found a point within 10px, and this point is more
          // than 10px away, stop searching. This lets us find the earliest
          // trajectory that's within 10px of the cursor.
          break
        }
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

  getPathForPoint({x, y}) {
    // Go backwards through the paths so we hit the topmost one first.
    for (let i = this.#paths.length - 1; i >= 0; i--) {
      const path = this.#paths[i]
      if (this.#ctx.isPointInPath(path, x, y))
        return path
    }
  }
}

canvas.addEventListener("contextmenu", event => {
  event.preventDefault()
})

canvas.addEventListener("mousedown", event => {
  event.preventDefault()

  const interactions = new InteractionContext2D(ctx)
  drawUI(interactions)
  const path = interactions.getPathForPoint({x: event.offsetX, y: event.offsetY})
  path?.mousedown?.(event)
  if (path) return

  const x0 = event.offsetX - canvas.width / 2 - pan.x
  const y0 = event.offsetY - canvas.height / 2 - pan.y

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
      for (let i = 0; i < ephemeris.bodies.length; i++) {
        const trajectory = ephemeris.trajectories[i]
        const currentPosition = trajectory.evaluatePosition(currentTime)
        const screenPos = worldToScreen(currentPosition)

        const dx = screenPos.x - event.offsetX
        const dy = screenPos.y - event.offsetY
        const r = Math.sqrt(dx * dx + dy * dy)
        if (r < Math.max(10, zoom / 1e9 * ephemeris.bodies[i].radius)) {
          originBodyIndex = i
          trajectoryBBTrees = new WeakMap
          pan.x = 0
          pan.y = 0

          requestDraw()
          return
        }
      }

      const point = findNearestTrajectory(event)
      if (point) {
        const vessel = vessels[point.i]
        const originBodyTrajectory = ephemeris.trajectories[originBodyIndex]
        const m = vessel.addManeuver(point.t, 0, vsub(vessel.trajectory.evaluateVelocity(point.t), originBodyTrajectory.evaluateVelocity(point.t)))
        selectManeuver(vessel, m)
      } else {
        selectManeuver(null, null)
      }
      requestDraw()
    }
  }

  canvas.addEventListener("mousemove", mousemove)
  window.addEventListener("mouseup", mouseup)
  window.addEventListener("blur", mouseup)
})

canvas.addEventListener("mousemove", event => {
  mouse.x = event.offsetX
  mouse.y = event.offsetY
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


function worldToScreen(pos, t = currentTime) {
  const originBodyTrajectory = ephemeris.trajectories[originBodyIndex]
  const originBodyPosition = originBodyTrajectory.evaluatePosition(t)
  return {
    x: (pos.x - originBodyPosition.x) / 1e9 * zoom + canvas.width / 2 + pan.x,
    y: (pos.y - originBodyPosition.y) / 1e9 * zoom + canvas.height / 2 + pan.y,
  }
}
function screenToWorld(pos, t = currentTime) {
  const originBodyTrajectory = ephemeris.trajectories[originBodyIndex]
  const originBodyPosition = originBodyTrajectory.evaluatePosition(t)
  return {
    x: (pos.x - canvas.width / 2 - pan.x) * 1e9 / zoom + originBodyPosition.x,
    y: (pos.y - canvas.height / 2 - pan.y) * 1e9 / zoom + originBodyPosition.y,
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
function screenToWorldWithoutOrigin(pos) {
  return {
    x: (pos.x - canvas.width / 2 - pan.x) * 1e9 / zoom,
    y: (pos.y - canvas.height / 2 - pan.y) * 1e9 / zoom,
  }
}

function clipLine(p1, p2) {
  const { width, height } = canvas
  return cohenSutherlandLineClip(
    0, width, 0, height,
    {x: p1.x / 1e9 * zoom + width / 2 + pan.x,
    y: p1.y / 1e9 * zoom + height / 2 + pan.y,},
    {x: p2.x / 1e9 * zoom + width / 2 + pan.x,
    y: p2.y / 1e9 * zoom + height / 2 + pan.y,}
  )
}

function bbIntersects(bb1, bb2) {
  return bb1.minX <= bb2.maxX && bb1.maxX >= bb2.minX && bb1.minY <= bb2.maxY && bb1.maxY >= bb2.minY && bb1.minT <= bb2.maxT && bb1.maxT >= bb2.minT
}
function bbContains(bb1, p) {
  return p.x >= bb1.minX && p.x <= bb1.maxX && p.y >= bb1.minY && p.y <= bb1.maxY && p.t >= bb1.minT && p.t <= bb1.maxT
}

class BBTree {
  #layers = [[]]
  get length() {
    return this.#layers[0].length
  }
  get layers() { return this.#layers }
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
   * @param {{minX: number, maxX: number, minY: number, maxY: number, minT: number, maxT: number}} bbTest The bounding box to test against.
   * @returns {{minX: number, maxX: number, minY: number, maxY: number, minT: number, maxT: number}} The first bounding box that intersects with `bbTest`, or `undefined` if none do.
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

function bbTreeForTrajectory(trajectory) {
  let bbtree = trajectoryBBTrees.get(trajectory)
  if (!bbtree) {
    bbtree = new BBTree
    trajectoryBBTrees.set(trajectory, bbtree)
    for (const [a, b] of trajectory.segments()) {
      const aPos = trajectoryPosInFrame(trajectory, a.time)
      const bPos = trajectoryPosInFrame(trajectory, b.time)
      bbtree.insert({
        minX: Math.min(aPos.x, bPos.x),
        minY: Math.min(aPos.y, bPos.y),
        maxX: Math.max(aPos.x, bPos.x),
        maxY: Math.max(aPos.y, bPos.y),
        minT: a.time,
        maxT: b.time,
        a,
        b,
      })
    }
  }
  return bbtree
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

function trajectoryVelocityInFrame(trajectory, t) {
  const originBodyTrajectory = ephemeris.trajectories[originBodyIndex]
  const q = trajectory.evaluateVelocity(t)
  const originQ = originBodyTrajectory.evaluateVelocity(t)

  return {
    x: q.x - originQ.x,
    y: q.y - originQ.y,
    t,
  }
}

function* trajectoryPoints(trajectory, t0, t1, opts = {}) {
  if (t1 === t0) return
  const { maxPoints = Infinity, resolution = 2e9/zoom } = opts
  const finalTime = t1
  let previousTime = t0
  let previousPosition = trajectoryPosInFrame(trajectory, t0)
  let previousVelocity = trajectoryVelocityInFrame(trajectory, t0)
  let dt = finalTime - previousTime

  yield previousPosition
  let pointsAdded = 1

  let t
  let estimatedError = NaN
  let position

  let skipStepUpdate = true
  while (pointsAdded < maxPoints && previousTime < finalTime) {
    do {
      if (!skipStepUpdate)
        dt *= 0.9 * Math.sqrt(resolution / estimatedError)
      skipStepUpdate = false
      t = previousTime + dt
      if (t > finalTime) {
        t = finalTime
        dt = t - previousTime
      }
      position = trajectoryPosInFrame(trajectory, t)
      const extrapolatedPosition = vadd(previousPosition, vscale(previousVelocity, dt))

      // TODO: ??? is this right?
      estimatedError = Math.hypot(position.x - extrapolatedPosition.x, position.y - extrapolatedPosition.y)
    } while (estimatedError > resolution)

    previousTime = t
    previousPosition = position
    previousVelocity = trajectoryVelocityInFrame(trajectory, t)

    yield position
    pointsAdded++
  }
}

function polyline(ctx, generator) {
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

function adjustManeuver() {
  if (!draggingManeuver)
    return

  // If the draggingManeuverLen is less than 80, make the duration shorter.
  // If it's more than 80, make the duration longer.
  const delta = (draggingManeuverLen - 80) / 70
  const dDuration = delta >= 0 ? Math.pow(delta, 2) : -Math.pow(-delta, 2)

  const prograde = currentManeuver.initialDirection
  const radial = vperp(prograde)
  const durationChangeDir = vadd(
    vscale(prograde, draggingManeuver.prograde),
    vscale(radial, draggingManeuver.radial)
  )

  const durationVec = vscale(currentManeuver.direction, currentManeuver.duration)
  const newDurationVec = vadd(durationVec, vscale(durationChangeDir, dDuration))

  const newDuration = vlen(newDurationVec)
  const newDirection = newDuration === 0 ? prograde : vnormalize(newDurationVec)

  currentManeuver.duration = newDuration
  currentManeuver.direction = newDirection
  maneuverVessel.trajectory.forgetAfter(currentManeuver.startTime)
  simUntil(currentTime)
  trajectoryBBTrees.delete(maneuverVessel.trajectory)

  requestDraw()
  requestAnimationFrame(adjustManeuver)
}

function selectManeuver(vessel, maneuver) {
  if (currentManeuver?.duration === 0) {
    maneuverVessel.removeManeuver(currentManeuver)
  }
  currentManeuver = maneuver
  maneuverVessel = vessel
}

/**
 * @param {CanvasRenderingContext2D} ctx
 */
function drawUI(ctx) {
  for (const vessel of vessels) {
    // Draw maneuver indicators.
    for (const maneuver of vessel.maneuvers) {
      const q = vessel.trajectory.evaluatePosition(maneuver.startTime)
      const originQ = ephemeris.trajectories[originBodyIndex].evaluatePosition(maneuver.startTime)
      const screenPos = worldToScreenWithoutOrigin(vsub(q, originQ))

      ctx.beginPath()
      ctx.arc(screenPos.x, screenPos.y, 5, 0, 2 * Math.PI)
      if (maneuver.startTime < currentTime) {
        ctx.strokeStyle = 'lightblue'
        ctx.lineWidth = 1
        ctx.stroke()
      } else {
        ctx.fillStyle = 'lightblue'
        ctx.fill()
        ctx.on?.('mousedown', () => {
          selectManeuver(vessel, maneuver)
        })
      }
    }
  }
  if (currentManeuver) {
    const vessel = maneuverVessel
    const q = vessel.trajectory.evaluatePosition(currentManeuver.startTime)
    const originQ = ephemeris.trajectories[originBodyIndex].evaluatePosition(currentManeuver.startTime)
    const screenPos = worldToScreenWithoutOrigin(vsub(q, originQ))

    ctx.strokeStyle = 'lightblue'
    ctx.fillStyle = 'black'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(screenPos.x, screenPos.y, 10, 0, 2 * Math.PI)
    ctx.fill()
    ctx.stroke()

    ctx.on?.('mousedown', () => {
      draggingManeuver = { time: 1, prograde: 0, radial: 0 }
    })

    if (currentManeuver.startTime >= currentTime) {
      ctx.fillStyle = 'white'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.font = '18px sans-serif'
      ctx.fillText('T–' + formatDuration(currentManeuver.startTime - currentTime), screenPos.x, screenPos.y + 20)
    }

    const prograde = currentManeuver.initialDirection
    const radial = vperp(prograde)
    const progradeLen = draggingManeuver?.prograde === 1 ? draggingManeuverLen : 80
    const retrogradeLen = draggingManeuver?.prograde === -1 ? draggingManeuverLen : 80
    const radialLen = draggingManeuver?.radial === 1 ? draggingManeuverLen : 80
    const antiRadialLen = draggingManeuver?.radial === -1 ? draggingManeuverLen : 80
    ctx.beginPath()
    ctx.moveTo(screenPos.x + prograde.x * 10, screenPos.y + prograde.y * 10)
    ctx.lineTo(
      screenPos.x + prograde.x * (progradeLen - 15),
      screenPos.y + prograde.y * (progradeLen - 15)
    )
    ctx.moveTo(screenPos.x + -prograde.x * 10, screenPos.y + -prograde.y * 10)
    ctx.lineTo(
      screenPos.x + -prograde.x * (retrogradeLen - 15),
      screenPos.y + -prograde.y * (retrogradeLen - 15)
    )
    ctx.moveTo(screenPos.x + radial.x * 10, screenPos.y + radial.y * 10)
    ctx.lineTo(
      screenPos.x + radial.x * radialLen,
      screenPos.y + radial.y * radialLen
    )
    ctx.moveTo(screenPos.x + -radial.x * 10, screenPos.y + -radial.y * 10)
    ctx.lineTo(
      screenPos.x + -radial.x * antiRadialLen,
      screenPos.y + -radial.y * antiRadialLen
    )
    ctx.stroke()

    ctx.strokeStyle = 'chartreuse'
    ctx.fillStyle = 'chartreuse'
    {
      const center = vadd(screenPos, vscale(prograde, progradeLen))

      ctx.beginPath()
      ctx.arc(center.x, center.y, 10, 0, 2 * Math.PI)
      ctx.moveTo(center.x, center.y - 10)
      ctx.lineTo(center.x, center.y - 20)
      ctx.moveTo(center.x - 10, center.y)
      ctx.lineTo(center.x - 20, center.y)
      ctx.moveTo(center.x + 10, center.y)
      ctx.lineTo(center.x + 20, center.y)
      ctx.stroke()

      ctx.on?.('mousedown', () => {
        draggingManeuver = { prograde: 1, radial: 0 };
        draggingManeuverLen = 80
        adjustManeuver()
      })

      ctx.beginPath()
      ctx.arc(center.x, center.y, 2, 0, 2 * Math.PI)
      ctx.fill()
    }

    {
      const center = vadd(screenPos, vscale(prograde, -retrogradeLen))

      ctx.beginPath()
      ctx.arc(center.x, center.y, 10, 0, 2 * Math.PI)
      ctx.moveTo(center.x, center.y - 10)
      ctx.lineTo(center.x, center.y - 20)
      {
        const aDir = {
          x: Math.cos(Math.PI * 1/3 + Math.PI/2),
          y: Math.sin(Math.PI * 1/3 + Math.PI/2)
        }
        ctx.moveTo(center.x + aDir.x * 10, center.y + aDir.y * 10)
        ctx.lineTo(center.x + aDir.x * 20, center.y + aDir.y * 20)
      }
      {
        const bDir = {
          x: Math.cos(-Math.PI * 1/3 + Math.PI/2),
          y: Math.sin(-Math.PI * 1/3 + Math.PI/2)
        }
        ctx.moveTo(center.x + bDir.x * 10, center.y + bDir.y * 10)
        ctx.lineTo(center.x + bDir.x * 20, center.y + bDir.y * 20)
      }
      ctx.stroke()

      ctx.on?.('mousedown', () => {
        draggingManeuver = { prograde: -1, radial: 0 };
        draggingManeuverLen = 80
        adjustManeuver()
      })

      ctx.lineWidth = 1
      const dir = {
        x: Math.cos(Math.PI / 4),
        y: Math.sin(Math.PI / 4)
      }
      ctx.beginPath()
      ctx.moveTo(center.x - dir.x * 10, center.y - dir.y * 10)
      ctx.lineTo(center.x + dir.x * 10, center.y + dir.y * 10)
      ctx.moveTo(center.x - dir.x * 10, center.y + dir.y * 10)
      ctx.lineTo(center.x + dir.x * 10, center.y - dir.y * 10)
      ctx.stroke()
    }

    ctx.lineWidth = 2
    ctx.strokeStyle = 'black'
    ctx.fillStyle = '#00d7d6'
    polygon(ctx, vadd(screenPos, vscale(radial, radialLen)), 4, 10, Math.PI / 2)
    ctx.stroke()
    ctx.fill()
    ctx.on?.('mousedown', () => {
      draggingManeuver = { prograde: 0, radial: 1 };
      draggingManeuverLen = 80
      adjustManeuver()
    })

    polygon(ctx, vadd(screenPos, vscale(radial, -antiRadialLen)), 4, 10, -Math.PI / 2)
    ctx.stroke()
    ctx.fill()
    ctx.on?.('mousedown', () => {
      draggingManeuver = { prograde: 0, radial: -1 };
      draggingManeuverLen = 80
      adjustManeuver()
    })

    if (draggingManeuver && ctx.on) {
      ctx.beginPath()
      ctx.rect(0, 0, canvas.width, canvas.height)
      ctx.on?.('mousemove', (e) => {
        const prograde = currentManeuver.initialDirection
        const radial = vperp(prograde)
        const vec = vadd(
          vscale(prograde, draggingManeuver.prograde),
          vscale(radial, draggingManeuver.radial)
        )
        const a = vdot(vsub(e, screenPos), vec)
        draggingManeuverLen = Math.min(150, Math.max(10, a))
      })
      ctx.on?.('mouseup', () => {
        draggingManeuver = null
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

function makeTrajectoryPath(ctx, trajectory, t0, t1, drawPoints = false) {
  const bbtree = bbTreeForTrajectory(trajectory)
  const displayBB = {
    minX: (-canvas.width / 2 - pan.x) / zoom * 1e9,
    minY: (-canvas.height / 2 - pan.y) / zoom * 1e9,
    maxX: (canvas.width / 2 - pan.x) / zoom * 1e9,
    maxY: (canvas.height / 2 - pan.y) / zoom * 1e9,
    minT: t0,
    maxT: Infinity
  }
  let firstSegment = bbtree.queryFirst(displayBB)
  if (!firstSegment) return

  ctx.save()
  ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y)
  ctx.scale(zoom/1e9, zoom/1e9)
  ctx.beginPath()
  console.group('trajectory')
  let nSegs = 0
  while (firstSegment) {
    nSegs++
    // Render until we're off the screen
    let more = false
    let startedBeingOnScreen = false
    let nPoints = 0
    let lastPoint = null
    let nIterations = 0
    const p0 = trajectoryPosInFrame(trajectory, firstSegment.minT)
    const p1 = trajectoryPosInFrame(trajectory, firstSegment.maxT)
    const p0_ = {...p0}
    const p1_ = {...p1}
    if (!cohenSutherlandLineClip(displayBB.minX, displayBB.maxX, displayBB.minY, displayBB.maxY, p0_, p1_)) {
      // The segment doesn't actually intersect the screen
      displayBB.minT = firstSegment.maxT + 0.001
      firstSegment = bbtree.queryFirst(displayBB)
      continue
    }
    const t = vlen(vsub(p0_, p0)) / vlen(vsub(p1, p0))
    for (const p of trajectoryPoints(trajectory, firstSegment.minT + t * (firstSegment.maxT - firstSegment.minT), t1)) {
      nIterations++
      if (!startedBeingOnScreen && (p.t >= firstSegment.maxT || (lastPoint && cohenSutherlandLineClip(displayBB.minX, displayBB.maxX, displayBB.minY, displayBB.maxY, {...lastPoint}, {...p})) || bbContains(displayBB, p))) {
        startedBeingOnScreen = true
        if (!lastPoint) lastPoint = p
        ctx.moveTo(lastPoint.x, lastPoint.y)
      }
      lastPoint = p
      if (startedBeingOnScreen) {
        if (drawPoints) {
          ctx.moveTo(p.x, p.y)
          ctx.arc(p.x, p.y, 2*1e9/zoom, 0, 2 * Math.PI)
        } else {
          ctx.lineTo(p.x, p.y)
        }
        nPoints++
        if (!bbContains(displayBB, p)) {
          displayBB.minT = p.t
          more = true
          break
        }
      }
    }
    if (lastPoint)
    console.log(`rendered ${nPoints} points of ${nIterations} iterations, which is ${((lastPoint.t - firstSegment.minT) / nPoints).toFixed(1)} seconds per point`)
    if (!more) break
    let nextSegment = bbtree.queryFirst(displayBB)
    while (nextSegment && nextSegment.minT < displayBB.minT) {
      displayBB.minT = nextSegment.maxT + 0.0001
      nextSegment = bbtree.queryFirst(displayBB)
    }
    firstSegment = nextSegment
  }
  console.log('rendered ' + nSegs + ' segments')
  console.groupEnd()
  ctx.restore()
}

function drawTrajectory(ctx, trajectory, t0 = 0) {
  const bbtree = bbTreeForTrajectory(trajectory)
  const displayBB = {
    minX: (-canvas.width / 2 - pan.x) / zoom * 1e9,
    minY: (-canvas.height / 2 - pan.y) / zoom * 1e9,
    maxX: (canvas.width / 2 - pan.x) / zoom * 1e9,
    maxY: (canvas.height / 2 - pan.y) / zoom * 1e9,
    minT: t0,
    maxT: Infinity
  }
  let firstSegment = bbtree.queryFirst(displayBB)
  if (!firstSegment) return

  let showBBDebug = false
  if (showBBDebug) {
    ctx.lineWidth = 1
    let i = 0
    for (const layer of bbtree.layers) {
      for (const bb of layer) {
        // Red if the mouse is over it. |mouse| has the current mouse position in screen space.
        const mouseWorldSpace = screenToWorldWithoutOrigin(mouse)
        if (mouseWorldSpace.x >= bb.minX && mouseWorldSpace.x <= bb.maxX &&
            mouseWorldSpace.y >= bb.minY && mouseWorldSpace.y <= bb.maxY)
          ctx.strokeStyle = 'red'
        else
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
        ctx.strokeRect(
          (bb.minX / 1e9) * zoom + pan.x + canvas.width / 2,
          (bb.minY / 1e9) * zoom + pan.y + canvas.height / 2,
          (bb.maxX - bb.minX) / 1e9 * zoom,
          (bb.maxY - bb.minY) / 1e9 * zoom
        )
      }
      i++
    }
  }

  ctx.lineWidth = 2
  ctx.lineJoin = 'round'

  // Past
  makeTrajectoryPath(ctx, trajectory, 0, currentTime)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.stroke()

  // Future
  makeTrajectoryPath(ctx, trajectory, currentTime, trajectory.tMax)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.stroke()

  /*
  makeTrajectoryPath(ctx, trajectory, currentTime, trajectory.tMax, true)
  ctx.fillStyle = 'lightgreen'
  ctx.fill()
  */
}

function draw() {
  const start = performance.now()
  ctx.save()
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw trajectories
  ctx.lineWidth = 1

  const tMax = ephemeris.tMax
  for (const trajectory of ephemeris.trajectories) {
    const idx = ephemeris.trajectories.indexOf(trajectory)
    if (idx === originBodyIndex) continue
    drawTrajectory(ctx, trajectory)
  }

  // Draw bodies
  for (let i = 0; i < ephemeris.bodies.length; i++) {
    const body = ephemeris.bodies[i]
    const trajectory = ephemeris.trajectories[i]
    ctx.fillStyle = body.color
    const pos = trajectory.evaluatePosition(currentTime)
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
  for (const vessel of vessels) {
    drawTrajectory(ctx, vessel.trajectory)
  }

  // Draw vessel
  for (const vessel of vessels) {
    const pos = vessel.trajectory.evaluatePosition(currentTime)
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
  ctx.restore()

  const end = performance.now()
  const drawTime = end - start
  document.querySelector('#draw-time').textContent = drawTime.toFixed(2) + ' ms'
  document.querySelector('#zoom-level').textContent = zoom.toPrecision(2) + 'x'
  document.querySelector('#t').textContent = tMax
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
  simUntil(currentTime + ephemeris.step)
  requestDraw()
}

step10.onclick = () => {
  simUntil(currentTime + ephemeris.step * 10)
  requestDraw()
}

step100.onclick = () => {
  simUntil(currentTime + ephemeris.step * 100)
  requestDraw()
}

let timeLoop = null
let last = null
function loop(t) {
  timeLoop = requestAnimationFrame(loop)
  if (!last) {
    last = t
  } else {
    const dt = t - last
    last = t
    simUntil(currentTime + dt / 1000)
    requestDraw()
  }
}

document.querySelector("#start").onclick = () => {
  if (!timeLoop) loop()
}

document.querySelector("#stop").onclick = () => {
  if (timeLoop) {
    cancelAnimationFrame(timeLoop)
    timeLoop = null
    last = null
  }
}

draw()
