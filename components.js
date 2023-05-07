class Component {}
class GasNozzle extends Component {}
class ColdGasNozzle extends GasNozzle {
  constructor({thrust=0.0, fuel="hydrogen"}) {
    this.name = "Cold gas thruster"
    this.description = "Blowing pressurized gas through a nozzle produces thrust.  Inefficient but very simple and cheap."
    //TODO: do the math to figure out what the cost and mass are, given some nominal thrust and some fuel.  Different gasses will be more efficient.
    this.cost = 0
    this.totalMass = 0
  }
  costCalc(thrust) {
    // TODO
  }
  totalMassCalc(thrust) {
    // TODO
  }
}


class SolidThruster extends Component {}
class APCPRocket extends SolidThruster {
  constructor({thrust=0.0,propellantMass=0.0}) {
    this.name = "Ammonium perchlorate rocket"
    this.description = "A well rounded solid rocket motor"
    //TODO: do the math to figure out what the cost, burn time and total impulse delivered are, given some thrust and mass
    this.cost = 0
    this.burntime = 0
    this.totalImpulse = 0
    this.totalMass = 0
  }
  costCalc(thrust, propmass) {
    // Higher thrust engines are going to be less mass efficient because they will be larger diameter, thus shorter, and thus more of their mass will be in the nozzle.
    // They will also have to have more structure to handle the acceleration of the higher thrust
    // Higher mass engines will be more cost efficient because of economies of scale, and also because the cost of the housing goes up as the 2/3 root of the propellant.
    //  i.e. If propellant starts at 1 and goes to 8, housing starts at 1 and goes to 4. if propellant goes to 27, housing goes to 9. etc.
  }
  burntimeCalc(thrust, propmass) {
    // TODO
  }
  totalImpulseCalc(thrust, propmass) {
    // TODO
  }
  totalMassCalc(thrust,propmass) {
    // TODO
  }
}

const currency = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0, minimumFractionDigits: 0, style: 'currency', currency: 'USD', style: 'currency' })
const mass = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0, minimumFractionDigits: 0, style: 'unit', unit: 'kilogram', style: 'unit' })
const isp = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0, minimumFractionDigits: 0, style: 'unit', unit: 'second', style: 'unit' })

export const components = [
  {
    type: "engine",
    name: "Cold gas thruster",
    description: "Blowing pressurized gas through a nozzle produces thrust.  Inefficient but very simple and cheap.",
    parameters: [
      {
        name: "Thrust",
        units: "kN",
        default: 100.0,
        min: 10.0,
        max: 200.0,
      },
    ],
    derivedParameters: [
      {
        name: "Isp",
        units: "s",
        format: isp,
        value: () => 30,
      },
      {
        name: "Mass",
        units: "kg",
        format: mass,
        value: ([thrust]) => thrust / 2.0,
      },
      {
        name: "Cost",
        units: "$",
        format: currency,
        value: ([thrust]) => 10 * thrust ** 0.99 * ({isp: 30}).isp ** 1.1,
      },
    ]
  }
]

export function instantiateComponent(component) {
  return {
    component,
    parameterValues: component.parameters.map(param => param.default),
  }
}
