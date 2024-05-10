// @ts-check

/** @typedef { import("./types").Vec2 } Vec2 */

import { DormandالمكاوىPrince1986RKN434FM, Fine1987RKNG34, ODEState, solveEmbeddedExplicitGeneralizedRungeKuttaNyström, solveEmbeddedExplicitRungeKuttaNyström } from "./integrators.js"
import { newhallApproximationInMonomialBasis } from "./newhall.js"

import { vops } from "./geometry.js"

const G = 6.67408e-11

function orbitalVelocity(m1, m2, r) {
  return Math.sqrt(G * (m1 + m2) / r)
}
/**
 * Compute the initial state of a body in a circular orbit around |parentBody|.
 * @param {*} parentBody
 * @param {number} r
 * @param {number} t
 * @returns
 */
export function initialOrbitState(parentBody, r, t = 0) {
  const v = orbitalVelocity(parentBody.mass, 0, r)
  return {
    position: vops.add(parentBody.position, { x: r * Math.cos(t), y: r * Math.sin(t) }),
    velocity: vops.add(parentBody.velocity, { x: 0, y: v }),
  }
}


/*
const divisions = 8
const minDegree = 3
const maxDegree = divisions * 2 + 1
const maxDegreeAge = 100

class Trajectory {
  #firstTime
  #times = []
  #positions = []
  #velocities = []
  #tolerance
  #adjustedTolerance
  #step
  #degreeAge = 0
  #isUnstable = false
  #degree = minDegree
  #polynomials = []

  constructor(step, tolerance) {
    this.#step = step
    this.#tolerance = tolerance
    this.#adjustedTolerance = tolerance
  }

  get tMax() {
    return this.#polynomials.length ? this.#polynomials[this.#polynomials.length - 1].tMax : this.#firstTime
  }

  append(time, position, velocity) {
    if (this.#firstTime === undefined) {
      this.#firstTime = time
    }

    this.#times.push(time)
    this.#positions.push(position)
    this.#velocities.push(velocity)
    if (this.#positions.length === divisions + 1) {
      this.computeBestNewhallApproximation(time, this.#positions, this.#velocities)
      this.#times[0] = this.#times[divisions]
      this.#times.length = 1
      this.#positions[0] = this.#positions[divisions]
      this.#positions.length = 1
      this.#velocities[0] = this.#velocities[divisions]
      this.#velocities.length = 1
    }
  }

  computeBestNewhallApproximation(t, q, v) {
    const previousAdjustedTolerance = this.#adjustedTolerance

    // If the degree is too old, restart from the lowest degree.
    // This ensures that we use the lowest possible degree at a small computational cost.
    if (this.#degreeAge >= maxDegreeAge) {
      this.#isUnstable = false
      this.#adjustedTolerance = this.#tolerance
      this.#degree = minDegree
      this.#degreeAge = 0
    }

    // Compute the approximation with the current degree.
    const { polynomial, errorEstimate } = newhallApproximationInMonomialBasis(
      this.#degree, divisions, vops, q, v, this.#times[0], t)
    this.#polynomials.push({tMax: t, polynomial})

    // Estimate the error. For initializing |previousErrorEstimate|, any value
    // greater than |error| will do.
    let error = vops.norm(errorEstimate)
    let previousErrorEstimate = error + error;

    // If we are in the zone of numerical instabilities and we exceeded the
    // tolerance, restart from the lowest degree.
    if (this.#isUnstable && error > this.#adjustedTolerance) {
      this.#degree++
      const { polynomial, errorEstimate } = newhallApproximationInMonomialBasis(
        this.#degree, divisions, vops, q, v, this.#times[0], t)
      this.#polynomials[this.#polynomials.length - 1].polynomial = polynomial
      previousErrorEstimate = error
      error = vops.norm(errorEstimate)
    }

    // Increase the degree if the approximation is not accurate enough. Stop
    // when we reach the maximum degree or when the error estimate is not
    // decreasing.
    while (error > this.#adjustedTolerance && error < previousErrorEstimate && this.#degree < maxDegree) {
      this.#degree++
      const { polynomial, errorEstimate } = newhallApproximationInMonomialBasis(
        this.#degree, divisions, vops, q, v, this.#times[0], t)
      this.#polynomials[this.#polynomials.length - 1].polynomial = polynomial
      previousErrorEstimate = error
      error = vops.norm(errorEstimate)
    }

    // If we have entered the zone of numerical instability, go back to the
    // point where the error was decreasing and nudge the tolerance since we
    // won't be able to reliably do better than that.
    if (error > previousErrorEstimate) {
      if (this.#degree > minDegree) {
        this.#degree--
      }
      this.#isUnstable = true
      error = previousErrorEstimate
      this.#adjustedTolerance = Math.max(this.#adjustedTolerance, error)
    }

    // Check that the tolerance did not explode.
    this.#degreeAge++
    if (this.#adjustedTolerance >= 1e6 * previousAdjustedTolerance) {
      throw new Error("an apocalypse has occurred")
    }
  }

  #findPolynomialForInstant(t) {
    return this.#polynomials[lowerBound(this.#polynomials, t, (p, t) => p.tMax < t)].polynomial
  }

  evaluatePosition(t) {
    const polynomial = this.#findPolynomialForInstant(t)
    return polynomial.evaluate(t)
  }
}

// equivalent of std::lower_bound
function lowerBound(array, value, compare) {
  let first = 0
  let count = array.length
  while (count > 0) {
    const step = Math.floor(count / 2)
    let it = first + step
    if (compare(array[it], value)) {
      first = ++it
      count -= step + 1
    } else {
      count = step
    }
  }
  return first
}
*/

// equivalent of std::lower_bound
function lowerBound(array, compare) {
  let first = 0
  let count = array.length
  while (count > 0) {
    const step = Math.floor(count / 2)
    let it = first + step
    if (compare(array[it])) {
      first = ++it
      count -= step + 1
    } else {
      count = step
    }
  }
  return first
}

export class Trajectory {
  /** @type {Array<{time: number, position: Vec2, velocity: Vec2}>} */
  #points = []

  init({points}) {
    this.#points = points
    return this
  }

  static create(points = []) {
    return new Trajectory().init({points})
  }

  serialize() {
    return { points: this.#points }
  }

  deserialize({points}) {
    this.init({ points })
  }

  append(time, position, velocity) {
    this.#points.push({time, position, velocity})
  }

  get tMax() {
    return this.#points.length ? this.#points[this.#points.length - 1].time : 0
  }

  *points(minT = 0) {
    if (minT === 0) {
      yield* this.#points
    } else {
      const i = lowerBound(this.#points, (p) => p.time < minT)
      for (let j = i; j < this.#points.length; j++) yield this.#points[j]
    }
  }

  /**
   * @param {number} t
   */
  forgetAfter(t) {
    const i = lowerBound(this.#points, (p) => p.time <= t)
    this.#points.splice(i)
  }

  /**
   * @param {number} t
   * @returns {Vec2}
   */
  evaluatePosition(t) {
    if (t === this.#points[this.#points.length - 1].time) {
      return this.#points[this.#points.length - 1].position
    }
    const i = lowerBound(this.#points, (p) => p.time < t)
    if (i === 0) {
      return this.#points[0].position
    }
    if (i === this.#points.length) {
      return this.#points[this.#points.length - 1].position
    }
    // interpolate between |i - 1| and |i|
    const p0 = this.#points[i - 1]
    const p1 = this.#points[i]
    const t0 = p0.time
    const t1 = p1.time
    const q0 = p0.position
    const q1 = p1.position
    return vops.addi(vops.scalei(vops.sub(q1, q0), (t - t0) / (t1 - t0)), q0)
  }

  /**
   *
   * @param {number} t
   * @returns {Vec2}
   */
  evaluateVelocity(t) {
    if (t === this.#points[this.#points.length - 1].time) {
      return this.#points[this.#points.length - 1].velocity
    }
    const i = lowerBound(this.#points, (p) => p.time < t)
    if (i === 0) {
      return this.#points[0].velocity
    }
    if (i === this.#points.length) {
      return this.#points[this.#points.length - 1].velocity
    }
    // interpolate between |i - 1| and |i|
    const p0 = this.#points[i - 1]
    const p1 = this.#points[i]
    const t0 = p0.time
    const t1 = p1.time
    const v0 = p0.velocity
    const v1 = p1.velocity
    return vops.add(v0, vops.scale(vops.sub(v1, v0), (t - t0) / (t1 - t0)))
  }
}

/** @typedef {{name: string, mass: number, radius: number, color: string}} Body */

export class Ephemeris {
  /** @type {Array<Body>} */
  #bodies
  /** @type {Array<Trajectory>} */
  #trajectories
  /** @type {number} */
  #step

  init({bodies, trajectories, step}) {
    this.#bodies = bodies
    this.#trajectories = trajectories
    this.#step = step
    return this
  }

  /**
   * @param {{step: number, bodies: Array<Body>, initialState: Array<{position: Vec2, velocity: Vec2}>}} param0
   */
  static create({step, bodies, initialState}) {
    if (initialState.length !== bodies.length)
      throw new Error("initialState.length !== bodies.length")
    return new Ephemeris().init({
      bodies,
      step,
      trajectories: initialState.map((dof) => {
        return Trajectory.create([{...dof, time: 0}])
      })
    })
  }

  serialize(serialize) {
    return {
      bodies: this.#bodies,
      trajectories: this.#trajectories.map(serialize),
      step: this.#step,
    }
  }

  deserialize({bodies, trajectories, step}, deserialize) {
    this.init({
      bodies,
      trajectories: trajectories.map(t => deserialize(Trajectory, t)),
      step,
    })
  }

  /** @returns {Array<Body>} */
  get bodies() {
    return this.#bodies
  }

  /** @returns {Array<Trajectory>} */
  get trajectories() {
    return this.#trajectories
  }

  /** @returns {number} */
  get tMax() {
    return this.#trajectories.reduce((tMax, t) => Math.min(tMax, t.tMax), this.#trajectories[0].tMax)
  }

  /** @returns {number} */
  get step() {
    return this.#step
  }

  // Prolong the trajectories to at least |t|.
  prolong(t) {
    while (this.tMax < t) {
      const tInitial = this.tMax
      const bodyDofs = this.#bodies.map((body, i) => {
        const trajectory = this.#trajectories[i]
        const position = trajectory.evaluatePosition(tInitial)
        const velocity = trajectory.evaluateVelocity(tInitial)
        return {position, velocity, mass: body.mass}
      })
      bodyDofs
        .map((body, i) =>
          integrate(
            (state) => gravitation(bodyDofs, i, state.position),
            body,
            tInitial,
            this.#step
          ))
        .forEach(({position, velocity}, i) => {
          this.#trajectories[i].append(tInitial + this.#step, position, velocity)
        })
    }
  }

  /**
   * @param {Trajectory} trajectory
   * @param {number} t
   * @param {(t: number, p: Vec2, v: Vec2) => Vec2} intrinsicAcceleration
   * @param {*} parameters
   */
  flowWithAdaptiveStep(trajectory, t, intrinsicAcceleration = (() => vops.zero), parameters = {lengthIntegrationTolerance: 1, speedIntegrationTolerance: 1, maxSteps: Infinity}) {
    if (trajectory.tMax >= t) return
    this.prolong(t)
    const trajectoryLastTime = trajectory.tMax
    const trajectoryLastPosition = trajectory.evaluatePosition(trajectoryLastTime)
    const trajectoryLastVelocity = trajectory.evaluateVelocity(trajectoryLastTime)
    const initialState = new ODEState(
      vops,
      trajectoryLastTime,
      [trajectoryLastPosition],
      [trajectoryLastVelocity]
    )
    const integratorParameters = {
      firstStep: t - initialState.time.value,
      safetyFactor: 0.9,
      lastStepIsExact: true,
      maxSteps: parameters.maxSteps
    }
    const appendState = (state) => {
      trajectory.append(state.time.value, state.positions[0].value, state.velocities[0].value)
    }
    /**
     * @param {number} t
     * @param {Array<Vec2>} positions
     * @param {Array<Vec2>} velocities
     * @param {Array<Vec2>} accelerations
     */
    const computeAccelerations = (t, positions, velocities, accelerations) => {
      this.computeGravitationalAccelerationByAllMassiveBodiesOnMasslessBodies(t, positions, accelerations)
      const a = intrinsicAcceleration(t, positions[0], velocities[0])
      accelerations[0].x += a.x
      accelerations[0].y += a.y
    }
    const instance = {
      currentState: initialState,
      parameters: integratorParameters,
      computeAccelerations,
      step: integratorParameters.firstStep,
      appendState,
      toleranceToErrorRatio: toleranceToErrorRatio.bind(null, parameters.lengthIntegrationTolerance, parameters.speedIntegrationTolerance)
    }

    solveEmbeddedExplicitGeneralizedRungeKuttaNyström(
      vops,
      instance,
      Fine1987RKNG34,
      t,
    )
  }

  /**
   * @param {number} t
   * @param {Array<Vec2>} positions
   * @param {Array<Vec2>} accelerations
   */
  computeGravitationalAccelerationByAllMassiveBodiesOnMasslessBodies(t, positions, accelerations) {
    for (const a of accelerations) a.x = a.y = 0
    for (let i = 0; i < this.#bodies.length; ++i)
      this.computeGravitationalAccelerationByMassiveBodyOnMasslessBodies(t, i, positions, accelerations)
  }

  /**
   * @param {number} t
   * @param {number} bodyIndex
   * @param {Array<Vec2>} positions
   * @param {Array<Vec2>} accelerations
   */
  computeGravitationalAccelerationByMassiveBodyOnMasslessBodies(t, bodyIndex, positions, accelerations) {
    const µ1 = this.#bodies[bodyIndex].mass * G
    const trajectory = this.#trajectories[bodyIndex]
    const position = trajectory.evaluatePosition(t)

    for (let b2 = 0; b2 < positions.length; ++b2) {
      const dq = vops.sub(position, positions[b2])

      const dq2 = vops.norm2(dq)
      const dqNorm = Math.sqrt(dq2)
      const oneOverDq3 = dqNorm / (dq2 * dq2)
      const µ1OverDq3 = µ1 * oneOverDq3
      accelerations[b2].x += dq.x * µ1OverDq3
      accelerations[b2].y += dq.y * µ1OverDq3
    }
  }
}

/**
 * @param {number} lengthTolerance
 * @param {number} speedTolerance
 * @param {number} currentStepSize
 * @param {ODEState<{x: number, y: number}>} _state
 * @param {{ positionError: Array<{x: number, y: number}>, velocityError: Array<{x: number, y: number}> }} error
 */
function toleranceToErrorRatio(lengthTolerance, speedTolerance, currentStepSize, _state, error) {
  let maxLengthError = 0
  let maxSpeedError = 0
  for (const positionError of error.positionError)
    maxLengthError = Math.max(maxLengthError, vops.norm(positionError))
  for (const velocityError of error.velocityError)
    maxSpeedError = Math.max(maxSpeedError, vops.norm(velocityError))
  return Math.min(
    lengthTolerance / maxLengthError,
    speedTolerance / maxSpeedError
  )
}

/**
 * Gravitational force at |position| due to all bodies in |bodies| except |i|.
 * @param {Array<{mass: number, position: Vec2}>} bodies
 * @param {number} i
 * @param {Vec2} position
 */
function gravitation(bodies, i, position) {
  let ax = 0
  let ay = 0

  bodies.forEach((other, j) => {
    if (i === j) return

    const dx = other.position.x - position.x
    const dy = other.position.y - position.y
    const r = Math.hypot(dx, dy)
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
    dv: acc(state, t + dt)
  }
}

/**
 * RK4 integrator.
 * @param {(state: {position: Vec2, velocity: Vec2}, t: number) => Vec2} acc
 * @param {{position: Vec2, velocity: Vec2}} state
 * @param {number} t
 * @param {number} dt
 * @returns {{position: Vec2, velocity: Vec2}}
 */
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
