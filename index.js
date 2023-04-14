import { newhallApproximationInChebyshevBasis } from "./newhall.js"
// n-body simulation with runge-kutta 4th-order integrator
const G = 6.67408e-11

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

const dt = 8640
const stepsDivisor = 10

function gravitation(bodies, i, position) {
  let ax = 0
  let ay = 0

  bodies.forEach((other, j) => {
    if (i === j) return

    const dx = other.position.x - position.x
    const dy = other.position.y - position.y
    const r = Math.sqrt(dx * dx + dy * dy)
    const a = G * other.mass / (r * r)

    ax += a * dx / r
    ay += a * dy / r
  })

  return {x: ax, y: ay}
}

// based on Glenn Fiedler's tutorial at http://gafferongames.com/game-physics/integration-basics/
function evaluate(acc, initial, t, dt, d) {
  const state = {
    position: {
      x: initial.position.x + d.dp.x * dt,
      y: initial.position.y + d.dp.y * dt,
    },
    velocity: {
      x: initial.velocity.x + d.dv.x * dt,
      y: initial.velocity.y + d.dv.y * dt,
    }
  }

  return {
    dp: state.velocity,
    dv: acc(state, t)
  }
}
function integrate(acc, state, t, dt) {
  const a = evaluate(acc, state, t, 0, { dp: {x: 0, y: 0}, dv: {x: 0, y: 0} })
  const b = evaluate(acc, state, t, dt*0.5, a)
  const c = evaluate(acc, state, t, dt*0.5, b)
  const d = evaluate(acc, state, t, dt, c)

  const dpxdt = (a.dp.x + 2 * (b.dp.x + c.dp.x) + d.dp.x) / 6
  const dpydt = (a.dp.y + 2 * (b.dp.y + c.dp.y) + d.dp.y) / 6
  const dvxdt = (a.dv.x + 2 * (b.dv.x + c.dv.x) + d.dv.x) / 6
  const dvydt = (a.dv.y + 2 * (b.dv.y + c.dv.y) + d.dv.y) / 6

  return {
    position: {
      x: state.position.x + dpxdt * dt,
      y: state.position.y + dpydt * dt,
    },
    velocity: {
      x: state.velocity.x + dvxdt * dt,
      y: state.velocity.y + dvydt * dt,
    }
  }
}

function step(bodies, dt) {
  return bodies.map((body, i) => {
    const acc = (state) => gravitation(bodies, i, state.position)
    return {...body, ...integrate(acc, body, 0, dt)}
  })
}

function totalEnergy(bodies) {
  let kinetic = 0
  let potential = 0

  bodies.forEach((body, i) => {
    kinetic += 0.5 * body.mass * (body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y)

    bodies.forEach((other, j) => {
      if (i === j) return

      const dx = other.position.x - body.position.x
      const dy = other.position.y - body.position.y
      const r = Math.sqrt(dx * dx + dy * dy)

      potential -= G * body.mass * other.mass / r
    })
  })

  return kinetic + potential
}

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
      return
    }
  }

  function mousemove(event) {
    pan.x = event.offsetX - canvas.width / 2 - x0
    pan.y = event.offsetY - canvas.height / 2 - y0
  }

  function mouseup(event) {
    canvas.removeEventListener("mousemove", mousemove)
    canvas.removeEventListener("mouseup", mouseup)
  }

  canvas.addEventListener("mousemove", mousemove)
  canvas.addEventListener("mouseup", mouseup)
})

function worldToScreen(pos) {
  const originBody = bodies[originBodyIndex]
  return {
    x: pos.x / 1e9 * zoom - originBody.position.x / 1e9 * zoom + canvas.width / 2 + pan.x,
    y: pos.y / 1e9 * zoom - originBody.position.y / 1e9 * zoom + canvas.height / 2 + pan.y,
  }
}

const divisions = 8
class Trajectory {
  #positions = []
  #velocities = []
  constructor() {}

  append(time, position, velocity) {
    this.#positions.push(position)
    this.#velocities.push(velocity)
    if (this.#positions.length === divisions + 1) {
      this.computeBestNewhallApproximation(time, this.#positions, this.#velocities)
    }
    this.#positions[0] = this.#positions[divisions]
    this.#positions.length = 1
    this.#velocities[0] = this.#velocities[divisions]
    this.#velocities.length = 1
  }

  computeBestNewhallApproximation(t, q, v) {
  }
}

let trajectories = []

function draw(bodies) {
  const start = performance.now()
  ctx.save()
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Draw trajectories
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.lineWidth = 1

  const originBody = bodies[originBodyIndex]
  const originBodyTrajectory = trajectories[originBodyIndex]
  for (let trajectory of trajectories) {
    ctx.beginPath()
    let lastPos = null
    for (let i = 0; i < trajectory.length; i++) {
      const relativePoint = {
        x: trajectory[i].x - originBodyTrajectory[i].x + originBody.position.x,
        y: trajectory[i].y - originBodyTrajectory[i].y + originBody.position.y,
      }
      const screenPos = worldToScreen(relativePoint)
      if (i === 0) {
        ctx.moveTo(screenPos.x, screenPos.y)
        lastPos = screenPos
      } else {
        // Skip points that are too close to the previous point
        const dx = screenPos.x - lastPos.x
        const dy = screenPos.y - lastPos.y
        const r = dx * dx + dy * dy
        if (r < 10) continue
        ctx.lineTo(screenPos.x, screenPos.y)
        lastPos = screenPos
      }
    }
    ctx.stroke()
  }

  for (let body of bodies) {
    ctx.fillStyle = body.color
    const screenPos = worldToScreen(body.position)
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

  ctx.fillStyle = 'white'
  ctx.fillText("Total energy: " + totalEnergy(bodies).toExponential(4), 10, 20)
  const end = performance.now()
  const drawTime = end - start
  document.querySelector('#draw-time').textContent = drawTime.toFixed(2) + ' ms'
}

let raf = null
function loop() {
  const start = performance.now()
  for (let i = 0; i < stepsDivisor; i++) {
    bodies = step(bodies, dt / stepsDivisor)

    bodies.forEach((body, i) => {
      if (!trajectories[i]) trajectories[i] = []
      trajectories[i].push(body.position)

      // Limit trajectory length
      if (trajectories[i].length > 100000) trajectories[i].shift()
    })
  }
  const end = performance.now()
  const calcTime = end - start
  document.querySelector('#calc-time').textContent = calcTime.toFixed(2) + ' ms'
  draw(bodies)
  raf = requestAnimationFrame(loop)
}
function stopLoop() {
  cancelAnimationFrame(raf)
  raf = null
}

start.onclick = () => {
  if (!raf) loop()
}
document.querySelector('#stop').onclick = stopLoop
draw(bodies)
