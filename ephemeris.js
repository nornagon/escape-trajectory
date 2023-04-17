import { newhallApproximationInMonomialBasis } from "./newhall.js"

const vops = {
  add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y }
  },
  scale(a, s) {
    return { x: a.x * s, y: a.y * s }
  },
  norm(a) {
    return Math.sqrt(a.x * a.x + a.y * a.y)
  },
  zero: { x: 0, y: 0 },
}

const G = 6.67408e-11

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

export class Ephemeris {
  #bodies
  #trajectories
  #step

  constructor(initialState) {
    this.#bodies = initialState.bodies
    this.#step = initialState.step
    this.#trajectories = this.#bodies.map((b) => {
      const t = new Trajectory(initialState.step, initialState.tolerance)
      t.append(0, b.position, b.velocity)
      return t
    })
  }

  get bodies() {
    return this.#bodies
  }

  get trajectories() {
    return this.#trajectories
  }

  get tMax() {
    return this.#trajectories.reduce((tMax, t) => Math.min(tMax, t.tMax), this.#trajectories[0].tMax)
  }

  // Prolong the trajectories to at least |t|.
  prolong(t) {
    while (this.tMax < t) {
      const tInitial = this.tMax
      this.#bodies.forEach((body, i) => {
        const { position, velocity } = integrate(
          (state) => gravitation(this.#bodies, i, state.position),
          body,
          tInitial,
          this.#step
        )
        body.position = position
        body.velocity = velocity
        this.#trajectories[i].append(tInitial + this.#step, position, velocity)
      })
    }
  }
}

/**
 * Gravitational force at |position| due to all bodies in |bodies| except |i|.
 */
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

/**
 * Returns the next state of the system after |dt| seconds.
 * @param {*} bodies
 * @param {number} dt
 * @returns
 */
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
