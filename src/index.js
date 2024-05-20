import { bbContains, closestTOnSegment, cohenSutherlandLineClip } from "./geometry.js"
import { InteractionContext2D, polygon } from "./canvas-util.js"
import { BBTree, vops, lerp } from "./geometry.js"
import { html } from 'htm/preact'
import { render, options } from 'preact'
import { formatDuration, map, sliding } from "./util.js"
import { OverlayUI } from "./ui/overlay.js"
import { transientUiState, uiState } from "./ui/store.js"
import { universe, onUniverseChanged, Universe } from "./universe-state.js"
import { deserialize, serialize } from "./serialization.js"
import * as idb from "idb-keyval"
const {
  add: vadd,
  addi: vaddi,
  sub: vsub,
  scale: vscale,
  perp: vperp,
  normalize: vnormalize,
  lerp: vlerp,
  len: vlen,
  dot: vdot,
} = vops

const Second = 1
const Minute = 60 * Second
const Hour = 60 * Minute
const Day = 24 * Hour
const Month = 30 * Day


let trajectoryBBTrees = new WeakMap

/// UI STATE
let mouse = {x: 0, y: 0}

let originBodyIndex = 3
uiState.selection = { type: 'body', index: 3 }

let trajectoryHoverPoint = null
/** @type {import("./vessel.js").Maneuver | null} */
let currentManeuver = null

/** @type {import("./vessel.js").Maneuver | null} */
let draggingManeuver = null
let draggingManeuverLen = 0
let predictionHorizon = 1 * Day

/// SETUP
universe.prolong(predictionHorizon)

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("canvas")
canvas.style.background = 'black'
let width = canvas.width
let height = canvas.height

const ctx = canvas.getContext("2d", { alpha: false })

function defaultWheelDelta(event) {
  return -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002) * (event.ctrlKey ? 10 : 1);
}

canvas.addEventListener("wheel", event => {
  event.preventDefault()

  const wheelDelta = defaultWheelDelta(event)

  const x = event.offsetX - width / 2 - uiState.pan.x
  const y = event.offsetY - height / 2 - uiState.pan.y

  let k = Math.pow(2, wheelDelta)
  let oldZoom = uiState.zoom
  uiState.zoom *= k
  uiState.zoom = Math.min(uiState.zoom, 1)
  uiState.zoom = Math.max(uiState.zoom, 1e-11)
  k = uiState.zoom / oldZoom

  uiState.pan.x = event.offsetX - width / 2 - x * k
  uiState.pan.y = event.offsetY - height / 2 - y * k

  requestDraw()
})

function findNearestTrajectory(screenPos) {
  const {x, y} = screenPos
  let closestP = null
  let closestD = Infinity
  let closestI = -1
  universe.vessels.forEach((vessel, i) => {
    // Find the closestPointpoint on |trajectory|
    for (const [a, b] of sliding(vessel.trajectory.points(), 2)) {
      const aScreenPos = worldToScreen(a.position, a.time)
      const bScreenPos = worldToScreen(b.position, b.time)
      const t = closestTOnSegment(aScreenPos, bScreenPos, screenPos)
      const time = lerp(a.time, b.time, t)
      if (time >= universe.currentTime) {
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

canvas.addEventListener("contextmenu", event => {
  event.preventDefault()
})

canvas.addEventListener("mousedown", event => {
  event.preventDefault()

  const interactions = new InteractionContext2D(ctx)
  drawUI(interactions)
  for (const path of interactions.pathsAtPoint({x: event.offsetX, y: event.offsetY}))
    if (path?.mousedown) return path.mousedown(event)

  const x0 = event.offsetX - width / 2 - uiState.pan.x
  const y0 = event.offsetY - height / 2 - uiState.pan.y

  let dragged = false
  function mousemove(event) {
    uiState.pan.x = event.offsetX - width / 2 - x0
    uiState.pan.y = event.offsetY - height / 2 - y0
    dragged = true

    requestDraw()
  }

  function mouseup(event) {
    canvas.removeEventListener("mousemove", mousemove)
    window.removeEventListener("mouseup", mouseup)
    window.removeEventListener("blur", mouseup)
    if (!dragged) {
      for (let i = 0; i < universe.ephemeris.bodies.length; i++) {
        const trajectory = universe.ephemeris.trajectories[i]
        const currentPosition = trajectory.evaluatePosition(universe.currentTime)
        const screenPos = worldToScreen(currentPosition)

        const dx = screenPos.x - event.offsetX
        const dy = screenPos.y - event.offsetY
        const r = Math.hypot(dx, dy)
        if (r < Math.max(10, uiState.zoom * universe.ephemeris.bodies[i].radius)) {
          selectBody(i)
          if (event.detail === 2) {
            setOriginBody(i)
          }
          return
        }
      }

      const point = findNearestTrajectory(event)
      if (point && uiState.selection?.type === 'vessel' && uiState.selection.index === point.i) {
        const vessel = universe.vessels[point.i]
        const maneuver = vessel.maneuvers.find(m => m.startTime <= point.t && m.endTime >= point.t)
        if (maneuver) {
          selectManeuver(vessel, maneuver)
        } else {
          const m = vessel.addManeuver(point.t, universe.ephemeris.trajectories[originBodyIndex])
          selectManeuver(vessel, m)
        }
      } else {
        if (currentManeuver) {
          selectManeuver(null, null)
        } else {
          clearSelection()
        }
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
  const point = findNearestTrajectory(event)
  trajectoryHoverPoint = point
  transientUiState.trajectoryHoverTime = point?.t
  const interactions = new InteractionContext2D(ctx)
  drawUI(interactions)
  for (const path of interactions.pathsAtPoint({x: event.offsetX, y: event.offsetY}))
    path?.mousemove?.(event)

  requestDraw()
})

canvas.addEventListener("mouseup", event => {
  const interactions = new InteractionContext2D(ctx)
  drawUI(interactions)

  for (const path of interactions.pathsAtPoint({x: event.offsetX, y: event.offsetY}))
    path?.mouseup?.(event)

  requestDraw()
})


function worldToScreen(pos, t = universe.currentTime) {
  const originBodyTrajectory = universe.ephemeris.trajectories[originBodyIndex]
  const originBodyPosition = originBodyTrajectory.evaluatePosition(t)
  return {
    x: (pos.x - originBodyPosition.x) * uiState.zoom + width / 2 + uiState.pan.x,
    y: (pos.y - originBodyPosition.y) * uiState.zoom + height / 2 + uiState.pan.y,
  }
}
function screenToWorld(pos, t = universe.currentTime) {
  const originBodyTrajectory = universe.ephemeris.trajectories[originBodyIndex]
  const originBodyPosition = originBodyTrajectory.evaluatePosition(t)
  return {
    x: (pos.x - width / 2 - uiState.pan.x) / uiState.zoom + originBodyPosition.x,
    y: (pos.y - height / 2 - uiState.pan.y) / uiState.zoom + originBodyPosition.y,
  }
}
// This version doesn't subtract the origin body's position, so it can be used
// when drawing trajectories.
function worldToScreenWithoutOrigin(pos) {
  return {
    x: pos.x * uiState.zoom + width / 2 + uiState.pan.x,
    y: pos.y * uiState.zoom + height / 2 + uiState.pan.y,
  }
}
function screenToWorldWithoutOrigin(pos) {
  return {
    x: (pos.x - width / 2 - uiState.pan.x) / uiState.zoom,
    y: (pos.y - height / 2 - uiState.pan.y) / uiState.zoom,
  }
}

function bbTreeForTrajectory(trajectory) {
  let bbtree = trajectoryBBTrees.get(trajectory)
  if (!bbtree) {
    bbtree = new BBTree
    trajectoryBBTrees.set(trajectory, bbtree)
  }
  for (const [{inFrame: aPos, p: a}, {inFrame: bPos, p: b}] of sliding(map(trajectory.points(bbtree.boundingBox?.maxT ?? 0), p => ({inFrame: trajectoryPosInFrame(trajectory, p.time), p})), 2)) {
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
  return bbtree
}

function trajectoryPosInFrame(trajectory, t) {
  const originBodyTrajectory = universe.ephemeris.trajectories[originBodyIndex]
  const q = trajectory.evaluatePosition(t)
  const originQ = originBodyTrajectory.evaluatePosition(t)

  return {
    x: q.x - originQ.x,
    y: q.y - originQ.y,
    t,
  }
}

function trajectoryVelocityInFrame(trajectory, t) {
  const originBodyTrajectory = universe.ephemeris.trajectories[originBodyIndex]
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
  const { maxPoints = Infinity, resolution = 2/uiState.zoom } = opts
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
      const extrapolatedPosition = vaddi(vscale(previousVelocity, dt), previousPosition)

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

function adjustManeuver() {
  if (!draggingManeuver)
    return

  const oldStartTime = currentManeuver.startTime
  if (draggingManeuver.time) {
    const delta = draggingManeuverLen / 70
    const dt = (delta >= 0 ? Math.pow(delta, 2) : -Math.pow(-delta, 2)) * 10
    currentManeuver.startTime += dt
    if (currentManeuver.startTime < universe.currentTime)
      currentManeuver.startTime = universe.currentTime
    // Prevent the maneuver from overlapping the following maneuver.
    const nextManeuver = currentManeuver.vessel.maneuvers.find(m => m.startTime > currentManeuver.startTime)
    if (nextManeuver)
      currentManeuver.startTime = Math.min(currentManeuver.startTime, nextManeuver.startTime - currentManeuver.duration)

    // Prevent the maneuver from overlapping the previous maneuver.
    const previousManeuver = currentManeuver.vessel.maneuvers.findLast(m => m.startTime < currentManeuver.startTime)
    if (previousManeuver)
      currentManeuver.startTime = Math.max(currentManeuver.startTime, previousManeuver.endTime)
  } else {
    // If the draggingManeuverLen is less than 80, make the duration shorter.
    // If it's more than 80, make the duration longer.
    const delta = (draggingManeuverLen - 80) / 70 // -1 to 1
    const dDuration = delta >= 0 ? Math.pow(delta, 4) : -Math.pow(-delta, 4)

    const durationVec = vscale(currentManeuver.direction, currentManeuver.duration)
    const newDurationVec = vadd(durationVec, vscale({x: draggingManeuver.prograde, y: draggingManeuver.radial}, dDuration * 100))

    const newDuration = vlen(newDurationVec)
    const newDirection = newDuration === 0 ? {x: 0, y: 0} : vnormalize(newDurationVec)

    // Max out at the vessel's fuel limit.
    // 1. Start with the total onboard fuel.
    let fuel = currentManeuver.vessel.configuration.resources.volatiles
    // 2. Subtract the fuel used by _other_ maneuvers.
    for (const m of currentManeuver.vessel.maneuvers)
      if (m !== currentManeuver)
        fuel -= m.massUsed
    // 3. Divide by mass flow rate.
    let maxDuration = fuel / currentManeuver.massFlowRate

    // Further prevent the maneuver from overlapping the following maneuver.
    const nextManeuver = currentManeuver.vessel.maneuvers.find(m => m.startTime > currentManeuver.startTime)
    if (nextManeuver) {
      const nextManeuverStartTime = nextManeuver.startTime
      maxDuration = Math.min(maxDuration, nextManeuverStartTime - currentManeuver.startTime)
    }

    currentManeuver.duration = Math.min(maxDuration, newDuration)
    currentManeuver.direction = newDirection
  }
  currentManeuver.vessel.trajectory.forgetAfter(Math.min(oldStartTime, currentManeuver.startTime))
  universe.recompute()
  trajectoryBBTrees.delete(currentManeuver.vessel.trajectory)

  requestDraw()
  requestAnimationFrame(adjustManeuver)
}

function selectVessel(i) {
  clearSelection()
  uiState.selection = { type: 'vessel', index: i }
  requestDraw()
}

function selectBody(i) {
  clearSelection()
  uiState.selection = { type: 'body', index: i }
  requestDraw()
}

function clearSelection() {
  uiState.selection = null
  selectManeuver(null, null)
  requestDraw()
}

function selectManeuver(vessel, maneuver) {
  if (currentManeuver?.duration === 0) {
    currentManeuver.vessel.removeManeuver(currentManeuver)
  }
  currentManeuver = maneuver
}

function setOriginBody(i) {
  originBodyIndex = i
  trajectoryBBTrees = new WeakMap
  uiState.pan.x = 0
  uiState.pan.y = 0

  requestDraw()
}

const easing = {
  linear: t => t,
  easeInQuad: t => t*t,
  easeOutQuad: t => t*(2-t),
  easeInOutQuad: t => t<.5 ? 2*t*t : -1+(4-2*t)*t,
  easeInCubic: t => t*t*t,
  easeOutCubic: t => (--t)*t*t+1,
  easeInOutCubic: t => t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1,
  easeInQuart: t => t*t*t*t,
  easeOutQuart: t => 1-(--t)*t*t*t,
  easeInOutQuart: t => t<.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t,
  easeInQuint: t => t*t*t*t*t,
  easeOutQuint: t => 1+(--t)*t*t*t*t,
  easeInOutQuint: t => t<.5 ? 16*t*t*t*t*t : 1+16*(--t)*t*t*t*t,
}

const animations = new WeakMap
function useAnimation(key, duration, easing = t => t) {
  const anim = animations.get(key) ?? { t: 0 }
  animations.set(key, anim)
  anim.t = Math.min(1, anim.t + 1 / (60 * duration))
  const t = easing(anim.t)
  if (anim.t < 1) requestDraw()
  return t
}

/**
 * @param {CanvasRenderingContext2D} ctx
 */
function drawUI(ctx) {
  universe.vessels.forEach((vessel, i) => {
    const selected = uiState.selection?.type === 'vessel' && uiState.selection.index === i
    const pos = vessel.trajectory.evaluatePosition(universe.currentTime)
    const screenPos = worldToScreen(pos)

    ctx.fillStyle = selected ? 'white' : 'lightgray'
    ctx.beginPath()
    const r = 8
    ctx.rect(Math.round(screenPos.x - r), Math.round(screenPos.y - r), r * 2, r * 2)
    ctx.fill()
    ctx.on?.('mousedown', (e) => {
      if (e.button === 0) {
        selectVessel(i)
        requestDraw()
      }
    })
    if (selected) {
      const t = useAnimation(uiState.selection, 0.25, easing.easeOutQuad)
      const r2 = r + 4 + lerp(10, 0, t)
      ctx.strokeStyle = `rgba(255, 255, 255, ${t})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.rect(Math.round(screenPos.x - r2) + 0.5, Math.round(screenPos.y - r2) + 0.5, r2 * 2 - 1, r2 * 2 - 1)
      ctx.stroke()
    }
  })

  const selectedVessel = uiState.selection?.type === 'vessel' ? universe.vessels[uiState.selection.index] : null
  if (selectedVessel) {
    // Draw maneuver indicators.
    for (const maneuver of selectedVessel.maneuvers) {
      const q = selectedVessel.trajectory.evaluatePosition(maneuver.startTime)
      const originQ = universe.ephemeris.trajectories[originBodyIndex].evaluatePosition(maneuver.startTime)
      const screenPos = worldToScreenWithoutOrigin(vsub(q, originQ))

      ctx.beginPath()
      ctx.arc(screenPos.x, screenPos.y, 5, 0, 2 * Math.PI)
      if (maneuver.startTime < universe.currentTime) {
        ctx.strokeStyle = 'lightblue'
        ctx.lineWidth = 1
        ctx.stroke()
      } else {
        ctx.fillStyle = 'lightblue'
        ctx.fill()
        ctx.on?.('mousedown', (e) => {
          if (e.button === 0)
            selectManeuver(selectedVessel, maneuver)
          if (e.button === 2 && maneuver.startTime >= universe.currentTime) {
            selectedVessel.removeManeuver(maneuver)
            selectedVessel.trajectory.forgetAfter(maneuver.startTime)
            universe.recompute()
            trajectoryBBTrees.delete(selectedVessel.trajectory)
          }
        })
      }
    }
    if (currentManeuver) {
      const q = selectedVessel.trajectory.evaluatePosition(currentManeuver.startTime)
      const originQ = universe.ephemeris.trajectories[originBodyIndex].evaluatePosition(currentManeuver.startTime)
      const screenPos = worldToScreenWithoutOrigin(vsub(q, originQ))

      ctx.strokeStyle = 'lightblue'
      ctx.fillStyle = 'black'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(screenPos.x, screenPos.y, 10, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()

      ctx.on?.('mousedown', (e) => {
        draggingManeuver = { time: {
          initialPoint: {x: e.offsetX, y: e.offsetY},
        }, prograde: 0, radial: 0 }
        draggingManeuverLen = 0
        adjustManeuver()
      })

      if (currentManeuver.startTime >= universe.currentTime) {
        ctx.fillStyle = 'white'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.font = '18px Martian Mono'
        ctx.fillText('T–' + formatDuration(currentManeuver.startTime - universe.currentTime), screenPos.x, screenPos.y + 20)
      }

      const prograde = currentManeuver.prograde
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
        ctx.rect(0, 0, width, height)
        ctx.on?.('mousemove', (e) => {
          if (draggingManeuver.time) {
            draggingManeuverLen = Math.min(70, Math.max(-70, e.x - draggingManeuver.time.initialPoint.x))
          } else {
            const prograde = currentManeuver.prograde
            const radial = vperp(prograde)
            const vec = vadd(
              vscale(prograde, draggingManeuver.prograde),
              vscale(radial, draggingManeuver.radial)
            )
            const a = vdot(vsub(e, screenPos), vec)
            draggingManeuverLen = Math.min(150, Math.max(10, a))
          }
        })
        ctx.on?.('mouseup', () => {
          draggingManeuver = null
          draggingManeuverLen = 0
        })
      }
    } else if (trajectoryHoverPoint) {
      const q = selectedVessel.trajectory.evaluatePosition(trajectoryHoverPoint.t)
      const originQ = universe.ephemeris.trajectories[originBodyIndex].evaluatePosition(trajectoryHoverPoint.t)
      const screenPos = worldToScreenWithoutOrigin(vsub(q, originQ))

      const isManeuvering = selectedVessel.maneuvers.some(m => m.startTime <= trajectoryHoverPoint.t && m.endTime >= trajectoryHoverPoint.t)

      ctx.fillStyle = isManeuvering ? 'rgba(255, 128, 128, 0.8)' : 'lightblue'
      ctx.beginPath()
      ctx.arc(screenPos.x, screenPos.y, 5, 0, 2 * Math.PI)
      ctx.fill()
    }
  }

  if (uiState.selection?.type === 'body') {
    const trajectory = universe.ephemeris.trajectories[uiState.selection.index]
    const bodyScreenPos = worldToScreen(trajectory.evaluatePosition(universe.currentTime))

    // Draw a diamond around the body
    const t = useAnimation(uiState.selection, 0.25, easing.easeOutQuad)
    const diamondRadius = lerp(50, 10, t)
    ctx.beginPath()
    ctx.moveTo(bodyScreenPos.x, bodyScreenPos.y - diamondRadius)
    ctx.lineTo(bodyScreenPos.x + diamondRadius, bodyScreenPos.y)
    ctx.lineTo(bodyScreenPos.x, bodyScreenPos.y + diamondRadius)
    ctx.lineTo(bodyScreenPos.x - diamondRadius, bodyScreenPos.y)
    ctx.closePath()
    ctx.strokeStyle = `rgba(255, 255, 255, ${lerp(0, 1, t)})`
    ctx.lineWidth = 3
    ctx.stroke()
  }
}

function makeTrajectoryPath(ctx, trajectory, t0, t1, drawPoints = false) {
  ctx.beginPath()
  const bbtree = bbTreeForTrajectory(trajectory)
  const displayBB = {
    minX: (-width / 2 - uiState.pan.x) / uiState.zoom,
    minY: (-height / 2 - uiState.pan.y) / uiState.zoom,
    maxX: (width / 2 - uiState.pan.x) / uiState.zoom,
    maxY: (height / 2 - uiState.pan.y) / uiState.zoom,
    minT: t0,
    maxT: Infinity
  }
  let firstSegment = bbtree.queryFirst(displayBB)
  if (!firstSegment) return

  ctx.save()
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
    for (const p of trajectoryPoints(trajectory, Math.max(t0, Math.min(firstSegment.minT + t * (firstSegment.maxT - firstSegment.minT), t1)), t1)) {
      nIterations++
      if (!startedBeingOnScreen && (p.t >= firstSegment.maxT || (lastPoint && cohenSutherlandLineClip(displayBB.minX, displayBB.maxX, displayBB.minY, displayBB.maxY, {...lastPoint}, {...p})) || bbContains(displayBB, p))) {
        startedBeingOnScreen = true
        if (!lastPoint) lastPoint = p
        ctx.moveTo(lastPoint.x * uiState.zoom + width / 2 + uiState.pan.x, lastPoint.y * uiState.zoom + height / 2 + uiState.pan.y)
      }
      lastPoint = p
      if (startedBeingOnScreen) {
        if (drawPoints) {
          ctx.moveTo(p.x * uiState.zoom + width / 2 + uiState.pan.x, p.y * uiState.zoom + height / 2 + uiState.pan.y)
          ctx.arc(p.x * uiState.zoom + width / 2 + uiState.pan.x, p.y * uiState.zoom + height / 2 + uiState.pan.y, 2, 0, 2 * Math.PI)
        } else {
          ctx.lineTo(p.x * uiState.zoom + width / 2 + uiState.pan.x, p.y * uiState.zoom + height / 2 + uiState.pan.y)
        }
        nPoints++
        if (!bbContains(displayBB, p)) {
          displayBB.minT = p.t
          more = true
          break
        }
      }
    }
    if (lastPoint) console.log(`rendered ${nPoints} points of ${nIterations} iterations, which is ${((lastPoint.t - firstSegment.minT) / nPoints).toFixed(1)} seconds per point`)
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

function drawTrajectory(ctx, trajectory, selected = false, t0 = 0) {
  const bbtree = bbTreeForTrajectory(trajectory)
  const displayBB = {
    minX: (-width / 2 - uiState.pan.x) / uiState.zoom,
    minY: (-height / 2 - uiState.pan.y) / uiState.zoom,
    maxX: (width / 2 - uiState.pan.x) / uiState.zoom,
    maxY: (height / 2 - uiState.pan.y) / uiState.zoom,
    minT: t0,
    maxT: Infinity
  }
  let firstSegment = bbtree.queryFirst(displayBB)
  if (!firstSegment) return

  let showBBDebug = false
  if (showBBDebug) {
    ctx.lineWidth = 1
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
          (bb.minX) * uiState.zoom + uiState.pan.x + width / 2,
          (bb.minY) * uiState.zoom + uiState.pan.y + height / 2,
          (bb.maxX - bb.minX) * uiState.zoom,
          (bb.maxY - bb.minY) * uiState.zoom
        )
      }
    }
  }

  ctx.lineWidth = 2
  ctx.lineJoin = 'round'

  // Past
  /*
  makeTrajectoryPath(ctx, trajectory, 0, universe.currentTime)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.stroke()
  */

  // Future
  makeTrajectoryPath(ctx, trajectory, universe.currentTime, Math.min(universe.tMax, trajectory.tMax))
  if (selected) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
  } else {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  }
  ctx.stroke()

  let debugShowTrajectoryPoints = false
  if (debugShowTrajectoryPoints) {
    makeTrajectoryPath(ctx, trajectory, universe.currentTime, trajectory.tMax, true)
    ctx.fillStyle = 'lightgreen'
    ctx.fill()
  }
}

/**
 *
 * @param {*} ctx
 * @param {typeof universe.vessels[0]} vessel
 * @param {*} selected
 * @param {*} t0
 * @returns
 */
function drawVesselTrajectory(ctx, vessel, selected = false, t0 = 0) {
  const bbtree = bbTreeForTrajectory(vessel.trajectory)
  const displayBB = {
    minX: (-width / 2 - uiState.pan.x) / uiState.zoom,
    minY: (-height / 2 - uiState.pan.y) / uiState.zoom,
    maxX: (width / 2 - uiState.pan.x) / uiState.zoom,
    maxY: (height / 2 - uiState.pan.y) / uiState.zoom,
    minT: t0,
    maxT: Infinity
  }
  let firstSegment = bbtree.queryFirst(displayBB)
  if (!firstSegment) return

  ctx.lineWidth = 2
  ctx.lineJoin = 'round'

  // Past
  /*
  makeTrajectoryPath(ctx, trajectory, 0, universe.currentTime)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.stroke()
  */

  // Future
  let t = Math.max(t0, universe.currentTime)
  for (const maneuver of vessel.maneuvers) {
    if (maneuver.startTime >= t) {
      // Coast up to the maneuver start time
      makeTrajectoryPath(ctx, vessel.trajectory, t, maneuver.startTime)
      ctx.strokeStyle = selected ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)'
      ctx.stroke()

      // Draw the maneuver
      makeTrajectoryPath(ctx, vessel.trajectory, maneuver.startTime, maneuver.endTime)
      ctx.strokeStyle = selected ? 'rgba(255, 128, 128, 0.8)' : 'rgba(255, 128, 128, 0.4)'
      ctx.stroke()
      t = maneuver.endTime
    }
  }
  // Coast until tMax
  makeTrajectoryPath(ctx, vessel.trajectory, t, Math.min(universe.tMax, vessel.trajectory.tMax))
  ctx.strokeStyle = selected ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)'
  ctx.stroke()
}

function draw() {
  queueRedraw()
  const start = performance.now()
  ctx.save()
  ctx.scale(devicePixelRatio, devicePixelRatio)
  ctx.save()
  ctx.clearRect(0, 0, width, height)

  // Draw trajectories
  ctx.lineWidth = 1

  const tMax = universe.tMax
  universe.ephemeris.trajectories.forEach((trajectory, i) => {
    if (i !== originBodyIndex) {
      const selected = uiState.selection?.type === 'body' && uiState.selection.index === i
      drawTrajectory(ctx, trajectory, selected)
    }
  })

  // Draw bodies
  for (let i = universe.ephemeris.bodies.length - 1; i >= 0; i--) {
    const body = universe.ephemeris.bodies[i]
    const trajectory = universe.ephemeris.trajectories[i]
    ctx.fillStyle = body.color
    const pos = trajectory.evaluatePosition(universe.currentTime)
    const screenPos = worldToScreen(pos)
    ctx.beginPath()
    const r = Math.max(2, body.radius * uiState.zoom)
    ctx.arc(screenPos.x, screenPos.y, r, 0, 2 * Math.PI)
    ctx.fill()

    if (r > 2 && i !== 0) {
      const sunPos = universe.ephemeris.trajectories[0].evaluatePosition(universe.currentTime)
      const sunScreenPos = worldToScreen(sunPos)
      const toSunNorm = vnormalize(vsub(sunScreenPos, pos))
      const offset = vadd(screenPos, vscale(toSunNorm, r * 0.1))
      ctx.save()
      ctx.clip()
      ctx.beginPath()
      ctx.arc(offset.x, offset.y, r, 0, 2 * Math.PI)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.fill()
      ctx.restore()
    }

    const metrics = ctx.measureText(body.name)
    const diamondRadius = 10
    ctx.fillStyle = 'black'
    ctx.fillRect(screenPos.x + diamondRadius + 5, screenPos.y - metrics.actualBoundingBoxAscent - 2, metrics.width + 10, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + 4)
    if (uiState.selection?.type === 'body' && uiState.selection.index === i) {
      ctx.fillStyle = 'white'
    } else {
      ctx.fillStyle = 'gray'
    }
    ctx.font = '12px Martian Mono'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(body.name, screenPos.x + diamondRadius + 10, screenPos.y)
  }

  // Draw vessel trajectories
  universe.vessels.forEach((vessel, i) => {
    const selected = uiState.selection?.type === 'vessel' && uiState.selection.index === i
    drawVesselTrajectory(ctx, vessel, selected)
  })
  ctx.restore()

  ctx.save()
  drawUI(ctx)
  ctx.restore()

  ctx.restore()

  const end = performance.now()
  const drawTime = end - start
  document.querySelector('#draw-time').textContent = drawTime.toFixed(2) + ' ms'
  document.querySelector('#zoom-level').textContent = uiState.zoom.toPrecision(2) + 'x'
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
  universe.step(universe.ephemeris.step)
  universe.prolong(universe.currentTime + predictionHorizon)
}

step10.onclick = () => {
  universe.step(universe.ephemeris.step * 10)
  universe.prolong(universe.currentTime + predictionHorizon)
}

step100.onclick = () => {
  universe.step(universe.ephemeris.step * 100)
  universe.prolong(universe.currentTime + predictionHorizon)
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
    universe.step(dt / 1000)
    universe.prolong(universe.currentTime + predictionHorizon)
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

document.querySelector("#extendPrediction").onclick = () => {
  predictionHorizon += 10 * Hour
  universe.prolong(universe.currentTime + predictionHorizon)
}

document.querySelector("#reducePrediction").onclick = () => {
  predictionHorizon = Math.max(1 * Hour, predictionHorizon - 10 * Hour)
  universe.limit(universe.currentTime + predictionHorizon)
}

document.querySelector("#save").onclick = () => {
  idb.set('gameState', {
    universe: serialize(universe),
    uiState,
  })
}
document.querySelector("#load").onclick = () => {
  idb.get('gameState').then((saveState) => {
    if (saveState) {
      universe.init(deserialize(Universe, saveState.universe))
      clearSelection()
      Object.assign(uiState, saveState.uiState)
      requestDraw()
    }
  })
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  width = rect.width
  height = rect.height

  requestDraw()
}
window.addEventListener('resize', resizeCanvas)

let redrawQueued = false
function redraw() {
  render(html`<${OverlayUI} />`, document.querySelector('#overlay'))
  redrawQueued = false
}
function queueRedraw() {
  if (!redrawQueued) {
    redrawQueued = true
    queueMicrotask(redraw)
  }
}
options.event = (e) => {
  queueRedraw()
  return e
}
Promise.all([...document.fonts].map(f => f.load())).then(() => {
  resizeCanvas()
  redraw()
  onUniverseChanged(requestDraw)
})
