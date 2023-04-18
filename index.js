import { Ephemeris } from "./ephemeris.js"
import { cohenSutherlandLineClip } from "./geometry.js"

const initialBodies = [
  { name: "Sun", mass: 1.98855e30, position: {x: 0, y: 0}, velocity: {x: 0, y: 0}, radius: 695700e3, color: "#ff0" },

  { name: "Mercury", mass: 3.3011e23, position: {x: 5.791e10, y: 0}, velocity: {x: 0, y: 47.362e3}, radius: 2439.7e3, color: "#aaa" },

  { name: "Venus", mass: 4.8675e24, position: {x: 1.0821e11, y: 0}, velocity: {x: 0, y: 35.02e3}, radius: 6051.8e3, color: "#ac8657" },

  { name: "Earth", mass: 5.97237e24, position: {x: 1.496e11, y: 0}, velocity: {x: 0, y: 29.78e3}, radius: 6371e3, color: "#00f" },

  { name: "Moon", mass: 7.34767309e22, position: {x: 1.496e11 + 3.844e8, y: 0}, velocity: {x: 0, y: 29.78e3 + 1022}, radius: 1737.4e3, color: "#ccc" },

  { name: "Mars", mass: 6.4171e23, position: {x: 2.2794e11, y: 0}, velocity: {x: 0, y: 24.077e3}, radius: 3389.5e3, color: "#f00" },

  { name: "Jupiter", mass: 1.8986e27, position: {x: 7.7857e11, y: 0}, velocity: {x: 0, y: 13.07e3}, radius: 69911e3, color: "#f0f" },

  { name: "Saturn", mass: 5.6834e26, position: {x: 1.4335e12, y: 0}, velocity: {x: 0, y: 9.69e3}, radius: 58232e3, color: "#f0f" },

  { name: "Uranus", mass: 8.6810e25, position: {x: 2.8735e12, y: 0}, velocity: {x: 0, y: 6.81e3}, radius: 25362e3, color: "#f0f" },

  { name: "Neptune", mass: 1.0243e26, position: {x: 4.4951e12, y: 0}, velocity: {x: 0, y: 5.43e3}, radius: 24622e3, color: "#f0f" },

  { name: "Pluto", mass: 1.303e22, position: {x: 5.9064e12, y: 0}, velocity: {x: 0, y: 4.74e3}, radius: 1188.3e3, color: "#f0f" },

  { name: "Ceres", mass: 9.393e20, position: {x: 4.14e11, y: 0}, velocity: {x: 0, y: 17.9e3}, radius: 469.73e3, color: "#f0f" },
]

const ephemeris = new Ephemeris({
  bodies: initialBodies,
  time: 0,
  step: 10 * 60,
  tolerance: 1e-3,
})
window.ephemeris = ephemeris

ephemeris.prolong(365.25 * 24 * 60 * 60)

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("canvas")
canvas.style.background = 'black'

const ctx = canvas.getContext("2d")

let pan = {x: 0, y: 0}
let zoom = 1

let originBodyIndex = 0

let trajectoryPoint = null

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

canvas.addEventListener("mousedown", event => {
  event.preventDefault()

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

  const tMax = ephemeris.tMax
  let closestP = 0
  let closestD = Infinity
  let closestI = -1
  ephemeris.trajectories.forEach((trajectory, i) => {
    // Find the closest point on |trajectory|
    for (const point of trajectoryPoints(trajectory, 0, tMax)) {
      const p = worldToScreenWithoutOrigin(point)
      const d = Math.hypot(p.x - event.offsetX, p.y - event.offsetY)
      if (d < closestD) {
        closestD = d
        closestP = point
        closestI = i
      }
    }
  })
  if (closestD < 10) {
    trajectoryPoint = {
      i: closestI,
      t: closestP.t,
    }
    requestDraw()
  }

  function mousemove(event) {
    pan.x = event.offsetX - canvas.width / 2 - x0
    pan.y = event.offsetY - canvas.height / 2 - y0

    requestDraw()
  }

  function mouseup(event) {
    canvas.removeEventListener("mousemove", mousemove)
    window.removeEventListener("mouseup", mouseup)
    window.removeEventListener("blur", mouseup)
  }

  canvas.addEventListener("mousemove", mousemove)
  window.addEventListener("mouseup", mouseup)
  window.addEventListener("blur", mouseup)
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

function* trajectoryPoints(trajectory, t0, t1) {
  const originBodyTrajectory = ephemeris.trajectories[originBodyIndex]
  const minSubdivisionDistance = 1e9/zoom * 10
  const minSubdivisionDistanceSq = minSubdivisionDistance * minSubdivisionDistance
  let lastPos = null
  let lastT = t0
  for (let t = t0; t < t1; t += 100 * 60 * 8) {
    const q = trajectory.evaluatePosition(t)
    const originQ = originBodyTrajectory.evaluatePosition(t)

    const p = {
      x: q.x - originQ.x,
      y: q.y - originQ.y,
      t,
    }

    if (t !== t0) {
      if (clipLine(lastPos, p)) {
        const dx = p.x - lastPos.x
        const dy = p.y - lastPos.y
        if (dx * dx + dy * dy > minSubdivisionDistanceSq) {
          for (let ts = lastT; ts < t; ts += 100 * 60) {
            const q = trajectory.evaluatePosition(ts)
            const originQ = originBodyTrajectory.evaluatePosition(ts)
            yield { x: q.x - originQ.x, y: q.y - originQ.y, t: ts }
          }
        }
      }
    }

    yield p
    lastPos = p
    lastT = t
  }
  const q = trajectory.evaluatePosition(t1)
  const originQ = originBodyTrajectory.evaluatePosition(t1)
  const p = {x: q.x - originQ.x, y: q.y - originQ.y, t: t1}
  if (clipLine(lastPos, p)) {
    const dx = p.x - lastPos.x
    const dy = p.y - lastPos.y
    if (dx * dx + dy * dy >= minSubdivisionDistanceSq) {
      for (let ts = lastT; ts < t1; ts += 100 * 60) {
        const q = trajectory.evaluatePosition(ts)
        const originQ = originBodyTrajectory.evaluatePosition(ts)
        yield {x: q.x - originQ.x, y: q.y - originQ.y, t: ts}
      }
    }
  }
  yield p
}

function polyline(generator) {
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
    polyline(trajectoryPoints(trajectory, 0, tMax))
    ctx.restore()
    ctx.stroke()
  }

  if (trajectoryPoint) {
    const q = ephemeris.trajectories[trajectoryPoint.i].evaluatePosition(trajectoryPoint.t)
    const originQ = ephemeris.trajectories[originBodyIndex].evaluatePosition(trajectoryPoint.t)
    const screenPos = worldToScreenWithoutOrigin({x: q.x - originQ.x, y: q.y - originQ.y})
    ctx.fillStyle = 'white'
    ctx.beginPath()
    ctx.arc(screenPos.x, screenPos.y, 4, 0, 2 * Math.PI)
    ctx.fill()
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

  // Draw info
  ctx.fillStyle = 'white'
  //ctx.fillText("Total energy: " + totalEnergy(bodies).toExponential(4), 10, 20)
  const end = performance.now()
  const drawTime = end - start
  document.querySelector('#draw-time').textContent = drawTime.toFixed(2) + ' ms'
  document.querySelector('#zoom-level').textContent = zoom.toFixed(2) + 'x'
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

draw()
