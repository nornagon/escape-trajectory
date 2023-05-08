import { Trajectory } from "./ephemeris.js"
import { vops } from "./geometry.js"

const {
  add: vadd,
  sub: vsub,
  scale: vscale,
  perp: vperp,
  normalize: vnormalize,
} = vops

export class Maneuver {
  #vessel
  #startTime
  #duration
  #initialMass
  #direction // TODO: rename this. intensity?
  #referenceTrajectory

  constructor({ vessel, startTime, referenceTrajectory, initialMass }) {
    this.#vessel = vessel
    this.#startTime = startTime
    this.#duration = 0
    this.#direction = {x: 0, y: 0}
    this.#referenceTrajectory = referenceTrajectory
    this.#initialMass = initialMass
  }

  get vessel() { return this.#vessel }
  get startTime() { return this.#startTime }
  set startTime(t) { this.#startTime = t }
  get duration() { return this.#duration }
  set duration(d) { this.#duration = d }
  get direction() { return this.#direction }
  set direction(d) { this.#direction = d }
  get endTime() { return this.#startTime + this.#duration }

  get prograde() {
    const t = this.#startTime
    return vnormalize(vsub(this.#vessel.trajectory.evaluateVelocity(t), this.#referenceTrajectory.evaluateVelocity(t)))
  }

  inertialIntrinsicAcceleration(t) {
    // Intepret |direction| as if +x is prograde, +y is radial.
    const prograde = this.prograde
    const radial = vperp(prograde)
    const direction = vadd(vscale(prograde, this.#direction.x), vscale(radial, this.#direction.y))
    return this.#computeIntrinsicAcceleration(t, direction)
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

/**
 * Represents a vessel in flight.
 */
export class Vessel {
  #configuration
  #trajectory
  #maneuvers = []
  constructor({ configuration, initialState }) {
    this.#configuration = configuration
    this.#trajectory = new Trajectory(initialState)
  }

  get name() { return this.#configuration.name }
  get configuration() { return this.#configuration }
  get mass() { return this.#configuration.mass }
  get trajectory() { return this.#trajectory }
  get color() { return this.#configuration.color }
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

  addManeuver(startTime, referenceTrajectory) {
    this.#maneuvers.push(new Maneuver({
      vessel: this,
      startTime,
      referenceTrajectory,
      initialMass: this.mass, // TODO
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

// This represents what a vessel is "made of", i.e. its modules and resources.
// Things that don't change depending on whether the vessel is in flight or not.
export class VesselConfiguration {
  #name
  #color
  #modules
  #resources
  constructor({ name, color, modules, resources }) {
    this.#name = name
    this.#color = color
    this.#modules = modules
    this.#resources = resources
  }

  get name() { return this.#name }
  get color() { return this.#color }
  get modules() { return this.#modules }
  get resources() { return this.#resources }

  get mass() {
    return this.#modules.reduce((sum, m) => sum + m.mass, 0) + Object.values(this.#resources).reduce((sum, r) => sum + r, 0)
  }
}
