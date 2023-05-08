const currency = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0, minimumFractionDigits: 0, style: 'currency', currency: 'USD' })
const mass = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0, minimumFractionDigits: 0, style: 'unit', unit: 'kilogram' })
const isp = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0, minimumFractionDigits: 0, style: 'unit', unit: 'second' })
const thrust = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0, minimumFractionDigits: 0 })

export const parameterDisplay = {
  thrust: {
    name: "Thrust",
    format: v => thrust.format(v / 1000) + " kN",
  },
  isp: {
    name: "Isp",
    format: isp.format,
  },
  cost: {
    name: "Cost",
    format: currency.format,
  },
  mass: {
    name: "Mass",
    format: mass.format,
  },
}

export class Engine {
  static name = "Engine"
  get name() { return this.constructor.name }
}

export class ColdGasNozzle extends Engine {
  static name = "Cold gas thruster"
  static description = "Blowing pressurized gas through a nozzle produces thrust.  Inefficient but very simple and cheap."

  static parameters = {
    // Parameters with a min/max will be displayed as a slider.
    thrust: {
      min: 10e3,
      max: 200e3,
    },
    // Otherwise they will be displayed as a read-only value.
    isp: {},
    mass: {},
    cost: {},
  }

  // Editable values are stored as properties on the object. These are the defaults.
  thrust = 100e3
  isp = 30

  // Computed values are defined as getters.
  get mass() {
    return this.thrust / 2e3
  }

  get cost() {
    return 10 * (this.thrust / 1e3) ** 0.99 * this.isp ** 1.1
  }
}

export class MethaloxEngine extends Engine {
  static name = "Methalox rocket"
  static description = "A simple rocket engine that burns methane and oxygen. Low specific impulse, but cheap and easy to build."

  static parameters = {
    thrust: {
      min: 100e3,
      max: 2500e3,
    },
    isp: {
      min: 200.0,
      max: 500.0,
    },
    mass: {},
    cost: {},
  }

  thrust = 1000e3
  isp = 300

  get mass() {
    return this.thrust / 1e3 * 0.8
  }

  get cost() {
    return 10 * (this.thrust / 1e3) ** 0.99 * this.isp ** 1.1
  }
}

export const moduleTypes = [
  ColdGasNozzle,
  MethaloxEngine,
]
