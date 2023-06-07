import { Trajectory } from "./ephemeris.js"
import { Module } from "./modules.js"
import { vops } from "./geometry.js"

const {
  add: vadd,
  sub: vsub,
  scale: vscale,
  perp: vperp,
  normalize: vnormalize,
} = vops

export class Maneuver {
  /** @type {Vessel} */
  #vessel
  #startTime
  #duration
  #initialMass
  #direction // TODO: rename this. intensity?
  #referenceTrajectory

  /**
   * @param {{vessel: Vessel, startTime: number, referenceTrajectory: any, initialMass: number, duration: number, direction: Vec2}} param0
   */
  init({ vessel, startTime, referenceTrajectory, initialMass, duration, direction }) {
    this.#vessel = vessel
    this.#startTime = startTime
    this.#duration = duration
    this.#direction = direction
    this.#referenceTrajectory = referenceTrajectory
    this.#initialMass = initialMass
    return this
  }

  /**
   * @param {{vessel: Vessel, startTime: number, referenceTrajectory: any, initialMass: number, duration?: number, direction?: Vec2}} param0
   */
  static create({ vessel, startTime, referenceTrajectory, initialMass, duration = 0, direction = {x: 0, y: 0} }) {
    return new Maneuver().init({ vessel, startTime, referenceTrajectory, initialMass, duration, direction })
  }

  serialize(serialize) {
    return {
      vessel: serialize(this.#vessel),
      startTime: this.#startTime,
      duration: this.#duration,
      direction: this.#direction,
      referenceTrajectory: serialize(this.#referenceTrajectory),
      initialMass: this.#initialMass,
    }
  }

  deserialize({ vessel, startTime, duration, direction, referenceTrajectory, initialMass }, deserialize) {
    this.init({
      vessel: deserialize(Vessel, vessel),
      startTime,
      duration,
      direction,
      referenceTrajectory: deserialize(Trajectory, referenceTrajectory),
      initialMass,
    })
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

  get deltaV() {
    // TODO: use active engines instead of all engines
    const totalThrust = this.vessel.configuration.modules.reduce((sum, m) => sum + m.thrust, 0)
    const totalMassFlowRate = this.vessel.configuration.modules.reduce((sum, m) => sum + m.massFlowRate, 0)
    const initialMass = this.vessel.mass
    const massUsed = totalMassFlowRate * this.#duration
    const finalMass = initialMass - massUsed
    const effectiveVexh = totalThrust / totalMassFlowRate
    return effectiveVexh * Math.log(initialMass / finalMass)
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
      const thrust = this.vessel.configuration.modules.reduce((sum, m) => sum + m.thrust, 0)
      const massFlowRate = this.vessel.configuration.modules.reduce((sum, m) => sum + m.massFlowRate, 0)
      return vscale(direction, thrust / (this.#initialMass - massFlowRate * (t - this.#startTime)))
    }
    return { x: 0, y: 0 }
  }
}

/**
 * Represents a vessel in flight.
 */
export class Vessel {
  /** @type {VesselConfiguration} */
  #configuration
  #trajectory
  /** @type {Array<Maneuver>} */
  #maneuvers

  init({ configuration, trajectory, maneuvers }) {
    this.#configuration = configuration
    this.#trajectory = trajectory
    this.#maneuvers = maneuvers
    return this
  }

  static create({ configuration, trajectory, maneuvers, initialState }) {
    return new Vessel().init({
      configuration,
      trajectory: trajectory ?? Trajectory.create([initialState]),
      maneuvers: maneuvers ?? [],
    })
  }

  serialize(serialize) {
    return {
      configuration: serialize(this.#configuration),
      trajectory: serialize(this.#trajectory),
      maneuvers: this.#maneuvers.map(serialize),
    }
  }

  deserialize({ configuration, trajectory, maneuvers }, deserialize) {
    this.init({
      configuration: deserialize(VesselConfiguration, configuration),
      trajectory: deserialize(Trajectory, trajectory),
      maneuvers: maneuvers.map(m => deserialize(Maneuver, m)),
    })
  }

  get name() { return this.#configuration.name }
  get configuration() { return this.#configuration }
  get mass() { return this.#configuration.mass }
  get trajectory() { return this.#trajectory }
  get color() { return this.#configuration.color }
  get maneuvers() { return this.#maneuvers }

  /**
   * @param {number} t
   * @returns {Vec2}
   */
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
    this.#maneuvers.push(Maneuver.create({
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
  /** @type Array<Module> */
  #modules
  #resources

  init({ name, color, modules, resources }) {
    this.#name = name
    this.#color = color
    this.#modules = modules
    this.#resources = {volatiles: 0, metals: 0, rareMetals: 0, fissionables: 0, ...resources}
    return this
  }

  static create({ name, color, modules, resources }) {
    return new VesselConfiguration().init({ name, color, modules, resources })
  }

  serialize(serialize) {
    return {
      name: this.#name,
      color: this.#color,
      modules: this.#modules.map(serialize),
      resources: this.#resources,
    }
  }

  deserialize({ name, color, modules, resources }, deserialize) {
    this.init({ name, color, modules: modules.map(m => deserialize(Module, m)), resources })
  }

  get name() { return this.#name }
  set name(name) { this.#name = name }
  get color() { return this.#color }
  get modules() { return this.#modules }
  get resources() { return this.#resources }

  /**
   * @returns {number} The total mass of the vessel, including resources.
   */
  get mass() {
    return this.#modules.reduce((sum, m) => sum + m.mass, 0) + Object.values(this.#resources).reduce((sum, r) => sum + r, 0)
  }

  get deltaV() {
    // Assume all engines are active.
    // ∆v = Isp * g0 * ln(m0 / m1)
    // but we can't just add Isps from multiple engines
    // we can add thrust, and we can add mass flow rate
    // and T = v_e * m_dot
    // so v_e = T / m_dot
    // thus overall effective v_e = ∑T_i / ∑m_dot_i
    // and ∆v = ∑T_i / ∑m_dot_i * g0 * ln(m0 / m1)

    const totalThrust = this.#modules.reduce((sum, m) => sum + m.thrust, 0)
    const totalMassFlowRate = this.#modules.reduce((sum, m) => sum + m.massFlowRate, 0)
    const initialMass = this.mass
    const finalMass = initialMass - this.#resources.volatiles
    const effectiveVexh = totalThrust / totalMassFlowRate
    return effectiveVexh * Math.log(initialMass / finalMass)
  }
}
