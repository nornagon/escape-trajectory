import { Ephemeris } from "./ephemeris.js"

let bodies = [
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
  bodies,
  time: 0,
  step: 10 * 60,
  tolerance: 1e-3,
})
window.ephemeris = ephemeris

ephemeris.prolong(180 * 24 * 60 * 60)

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("canvas")
canvas.style.background = 'black'

const ctx = canvas.getContext("2d")

let pan = {x: 0, y: 0}
let zoom = 1

let originBodyIndex = 0

function defaultWheelDelta(event) {
  return -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002) * (event.ctrlKey ? 10 : 1);
}

// Pan and zoom, based on d3-zoom
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

  for (const body of bodies) {
    const screenPos = worldToScreen(body.position)

    const dx = screenPos.x - event.offsetX
    const dy = screenPos.y - event.offsetY
    const r = Math.sqrt(dx * dx + dy * dy)
    if (r < 10) {
      originBodyIndex = bodies.indexOf(body)
      pan.x = 0
      pan.y = 0

      requestDraw()
      return
    }
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
  const originBody = bodies[originBodyIndex]
  return {
    x: pos.x / 1e9 * zoom - originBody.position.x / 1e9 * zoom + canvas.width / 2 + pan.x,
    y: pos.y / 1e9 * zoom - originBody.position.y / 1e9 * zoom + canvas.height / 2 + pan.y,
  }
}

function draw() {
  const start = performance.now()
  ctx.save()
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw trajectories
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.lineWidth = 1

  const originBodyTrajectory = ephemeris.trajectories[originBodyIndex]
  const tMax = ephemeris.tMax
  for (const trajectory of ephemeris.trajectories) {
    ctx.save()
    ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y)
    ctx.scale(zoom/1e9, zoom/1e9)
    ctx.beginPath()
    for (let t = 0; t < tMax; t += 100 * 60 * 8) {
      const q = trajectory.evaluatePosition(t)
      const originQ = originBodyTrajectory.evaluatePosition(t)
      if (t === 0) {
        ctx.moveTo(q.x - originQ.x, q.y - originQ.y)
      } else {
        ctx.lineTo(q.x - originQ.x, q.y - originQ.y)
      }
    }
    const q = trajectory.evaluatePosition(tMax)
    const originQ = originBodyTrajectory.evaluatePosition(tMax)
    ctx.lineTo(q.x - originQ.x, q.y - originQ.y)
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

draw(bodies)
