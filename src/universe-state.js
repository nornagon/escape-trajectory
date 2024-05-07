import { Ephemeris } from "./ephemeris.js"
import { Vessel, VesselConfiguration } from "./vessel.js"

// Keplerian elements for the planets at J2000.0
// https://ssd.jpl.nasa.gov/?planet_pos

const au = 149597870700; // astronomical unit in meters
const km = 1000;
const KeplerianElements = {
  Sun: {
    a: 0,
    e: 0,
    i: 0,
    Ω: 0,
    ω: 0,
    M: 0,
  },
  Mercury: {
    a: 0.38709893 * au,
    e: 0.20563069,
    i: 7.00487,
    Ω: 48.33167,
    ω: 77.45645,
    M: 252.25084,
  },
  Venus: {
    a: 0.72333199 * au,
    e: 0.00677323,
    i: 3.39471,
    Ω: 76.68069,
    ω: 131.53298,
    M: 181.97973,
  },
  Earth: {
    a: 1.00000011 * au,
    e: 0.01671022,
    i: 0,
    Ω: 0,
    ω: 102.94719,
    M: 100.46435,
  },
  Luna: {
    a: 0.00256955529 * au,
    e: 0.054900489,
    i: 5.16,
    Ω: 125.08,
    ω: 318.15,
    M: 115.3654,
  },
  Mars: {
    a: 1.52366231 * au,
    e: 0.09341233,
    i: 1.85061,
    Ω: 49.57854,
    ω: 336.04084,
    M: 355.45332,
  },
  Phobos: {
    a: 9376 * km,
    e: 0.0151,
    i: 1.093,
    Ω: 207.8,
    ω: 150.1,
    M: 312.4,
  },
  Deimos: {
    a: 23463 * km,
    e: 0.0002,
    i: 1.788,
    Ω: 24.6,
    ω: 260.0,
    M: 317.7,
  },
  Jupiter: {
    a: 5.20336301 * au,
    e: 0.04839266,
    i: 1.30530,
    Ω: 100.55615,
    ω: 14.75385,
    M: 34.40438,
  },
  Callisto: {
    a: 1.8827e6 * km,
    e: 0.0074,
    i: 0.192,
    Ω: 16.689,
    ω: 85.0,
    M: 181.4,
  },
  Io: {
    a: 4.217e5 * km,
    e: 0.0041,
    i: 0.040,
    Ω: 43.977,
    ω: 84.129,
    M: 201.009,
  },
  Europa: {
    a: 6.709e5 * km,
    e: 0.0094,
    i: 0.470,
    Ω: 219.106,
    ω: 88.97,
    M: 64.496,
  },
  Ganymede: {
    a: 1.0704e6 * km,
    e: 0.0013,
    i: 0.177,
    Ω: 63.552,
    ω: 192.417,
    M: 104.97,
  },
  Saturn: {
    a: 9.53707032 * au,
    e: 0.05415060,
    i: 2.48446,
    Ω: 113.71504,
    ω: 92.43194,
    M: 49.94432,
  },
  Uranus: {
    a: 19.19126393 * au,
    e: 0.04716771,
    i: 0.76986,
    Ω: 74.22988,
    ω: 170.96424,
    M: 313.23218,
  },
  Neptune: {
    a: 30.06896348 * au,
    e: 0.00858587,
    i: 1.76917,
    Ω: 131.72169,
    ω: 44.97135,
    M: 304.88003,
  },
  Pluto: {
    a: 39.48168677 * au,
    e: 0.24880766,
    i: 17.14175,
    Ω: 110.30347,
    ω: 224.06676,
    M: 238.92881,
  },
  Ceres: {
    a: 2.765 * au,
    e: 0.079,
    i: 10.6,
    Ω: 80.3,
    ω: 73.1,
    M: 77.4,
  },
}

// Modify the Keplerian elements to bring all bodies into the z=0 plane

for (const body of Object.values(KeplerianElements)) {
  body.Ω = 0
  body.i = 0
}


const celestials = [
  { name: "Sun", mass: 1.98855e30, position: {x: 0, y: 0}, velocity: {x: 0, y: 0}, radius: 695700e3, color: "#ff0" },

  { name: "Mercury", mass: 3.3011e23, position: {x: 5.791e10, y: 0}, velocity: {x: 0, y: 47.362e3}, radius: 2439.7e3, color: "#aaa" },

  { name: "Venus", mass: 4.8675e24, position: {x: 1.0821e11, y: 0}, velocity: {x: 0, y: 35.02e3}, radius: 6051.8e3, color: "#ac8657" },

  { name: "Earth", mass: 5.97237e24, position: {x: 1.496e11, y: 0}, velocity: {x: 0, y: 29.78e3}, radius: 6371e3, color: "#00f" },

    { name: "Luna", mass: 7.34767309e22, position: {x: 1.496e11 + 3.844e8, y: 0}, velocity: {x: 0, y: 29.78e3 + 1022}, radius: 1737.4e3, color: "#ccc", parent: "Earth" },

  { name: "Mars", mass: 6.4171e23, position: {x: 2.2794e11, y: 0}, velocity: {x: 0, y: 24.077e3}, radius: 3389.5e3, color: "#ce8258" },

    { name: "Phobos", mass: 1.0659e16, position: {x: 2.2794e11 + 9.376e6, y: 0}, velocity: {x: 0, y: 24.077e3 + 2.138e3}, radius: 11.2667e3, color: "#967a6e", parent: "Mars" },
    { name: "Deimos", mass: 1.4762e15, position: {x: 2.2794e11 + 2.326e7, y: 0}, velocity: {x: 0, y: 24.077e3 + 1.351e3}, radius: 6.2e3, color: "#d7bb9a", parent: "Mars" },

  { name: "Jupiter", mass: 1.8986e27, position: {x: 7.7857e11, y: 0}, velocity: {x: 0, y: 13.07e3}, radius: 69911e3, color: "#d7722f" },

    { name: "Callisto", mass: 1.075938e23, position: {x: 7.7857e11 + 1.883e9, y: 0}, velocity: {x: 0, y: 13.07e3 + 8204}, radius: 2410e3, color: "#6c8976", parent: "Jupiter" },
    { name: "Io", mass: 8.931938e22, position: {x: 7.7857e11 + 4.21e8, y: 0}, velocity: {x: 0, y: 13.07e3 + 17200}, radius: 1821.6e3, color: "#e3d97b", parent: "Jupiter" },
    { name: "Europa", mass: 4.799844e22, position: {x: 7.7857e11 + 6.71e8, y: 0}, velocity: {x: 0, y: 13.07e3 + 13700}, radius: 1560.8e3, color: "#bfcaba", parent: "Jupiter" },
    { name: "Ganymede", mass: 1.4819e23, position: {x: 7.7857e11 + 1.07e9, y: 0}, velocity: {x: 0, y: 13.07e3 + 10800}, radius: 2634.1e3, color: "#b6ae9b", parent: "Jupiter" },

  { name: "Saturn", mass: 5.6834e26, position: {x: 1.4335e12, y: 0}, velocity: {x: 0, y: 9.69e3}, radius: 58232e3, color: "#e6c481" },

  { name: "Uranus", mass: 8.6810e25, position: {x: 2.8735e12, y: 0}, velocity: {x: 0, y: 6.81e3}, radius: 25362e3, color: "#cee6f6" },

  { name: "Neptune", mass: 1.0243e26, position: {x: 4.4951e12, y: 0}, velocity: {x: 0, y: 5.43e3}, radius: 24622e3, color: "#a7c7d4" },

  { name: "Pluto", mass: 1.303e22, position: {x: 5.9064e12, y: 0}, velocity: {x: 0, y: 4.74e3}, radius: 1188.3e3, color: "#d4c7b4" },

  { name: "Ceres", mass: 9.393e20, position: {x: 4.14e11, y: 0}, velocity: {x: 0, y: 17.9e3}, radius: 469.73e3, color: "#b1ada4" },
]

// derive the positions and velocities from the Keplerian elements
celestials.forEach(c => {
  const { a, e, i, Ω, ω, M } = KeplerianElements[c.name]
  const M_parent = celestials.find(p => p.name === (c.parent ?? "Sun"))?.mass ?? 0
  const { x, y, vx, vy } = KeplerianToCartesian(M_parent, a, e, i, Ω, ω, M)
  c.position = { x, y }
  c.velocity = { x: isNaN(vx) ? 0 : vx, y: isNaN(vx) ? 0 : vy }
  if (c.parent) {
    const parent = celestials.find(p => p.name === c.parent)
    c.position.x += parent.position.x
    c.position.y += parent.position.y
    c.velocity.x += parent.velocity.x
    c.velocity.y += parent.velocity.y
  }
})

function KeplerianToCartesian(M_parent, a, e, i, Ω, ω, M) {
  const G = 6.67430e-11;  // gravitational constant in m^3 kg^-1 s^-2

  // Convert degrees to radians
  i = i * Math.PI / 180;
  Ω = Ω * Math.PI / 180;
  ω = ω * Math.PI / 180;
  M = M * Math.PI / 180;

  // Mean motion n and gravitational parameter μ
  const μ = G * M_parent;
  const n = Math.sqrt(μ / Math.pow(a, 3));

  // Solve Kepler's equation for the eccentric anomaly E
  let E = M;
  for (let j = 0; j < 100; j++) {
      const E_next = E + (M + e * Math.sin(E) - E) / (1 - e * Math.cos(E));
      if (Math.abs(E_next - E) < 1e-9) break;
      E = E_next;
  }

  // True anomaly ν
  const ν = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));

  // Distance r
  const r = a * (1 - e * Math.cos(E));

  // Position in orbital plane
  const x_op = r * Math.cos(ν);
  const y_op = r * Math.sin(ν);

  // Velocity in orbital plane
  const v_x_op = -Math.sin(E) * (a * n) / (1 - e * Math.cos(E));
  const v_y_op = Math.sqrt(1 + e) * Math.cos(E) * (a * n) / (1 - e * Math.cos(E));

  // Rotation matrix for the orbital plane to the ecliptic plane
  const R = [
      [Math.cos(Ω) * Math.cos(ω) - Math.sin(Ω) * Math.sin(ω) * Math.cos(i), -Math.cos(Ω) * Math.sin(ω) - Math.sin(Ω) * Math.cos(ω) * Math.cos(i), Math.sin(Ω) * Math.sin(i)],
      [Math.sin(Ω) * Math.cos(ω) + Math.cos(Ω) * Math.sin(ω) * Math.cos(i), -Math.sin(Ω) * Math.sin(ω) + Math.cos(Ω) * Math.cos(ω) * Math.cos(i), -Math.cos(Ω) * Math.sin(i)],
      [Math.sin(ω) * Math.sin(i), Math.cos(ω) * Math.sin(i), Math.cos(i)]
  ];

  // Compute Cartesian coordinates in the ecliptic plane
  const x = R[0][0] * x_op + R[0][1] * y_op;
  const y = R[1][0] * x_op + R[1][1] * y_op;
  const z = R[2][0] * x_op + R[2][1] * y_op;

  // Compute velocities in the ecliptic plane
  const vx = R[0][0] * v_x_op + R[0][1] * v_y_op;
  const vy = R[1][0] * v_x_op + R[1][1] * v_y_op;
  const vz = R[2][0] * v_x_op + R[2][1] * v_y_op;

  return {
    x, y, z, vx, vy, vz // meters per second
  };
}



function blankUniverse() {
  const bodies = celestials.map(c => ({
    name: c.name,
    mass: c.mass,
    radius: c.radius,
    color: c.color,
  }))

  const bodyInitialStates = celestials.map(c => ({
    position: c.position,
    velocity: c.velocity,
  }))

  const sitesByName = {
    Earth: [
      Site.create({
        name: "KSC",
        facilities: [
          {
            type: "manufactory",
          }
        ],
        vessels: [],
        resources: { ore: 0, volatiles: Infinity, metals: Infinity, rareMetals: Infinity, fissionables: Infinity },
      }),
    ],
  }
  /** @type Array<Array<Site>> */
  const sites = bodies.map(b => sitesByName[b.name] || [])

  return Universe.create(bodies, sites, bodyInitialStates)
}

export class Site {
  init({ name, facilities, vessels, resources }) {
    this.name = name
    this.facilities = facilities
    this.vessels = vessels
    this.resources = resources
    return this
  }

  static create({ name, facilities, vessels, resources }) {
    return new Site().init({ name, facilities, vessels, resources })
  }

  serialize(serialize) {
    return {
      name: this.name,
      facilities: this.facilities,
      vessels: this.vessels.map(serialize),
      resources: this.resources,
    }
  }

  deserialize({ name, facilities, vessels, resources }, deserialize) {
    this.init({ name, facilities, vessels: vessels.map(v => deserialize(VesselConfiguration, v)), resources })
  }
}

export class Universe {
  /** @type {Ephemeris} */
  ephemeris
  currentTime = 0
  tMax = 0
  /** @type {Array<Array<Site>>} */
  sites = []
  /** @type {Array<Vessel>} */
  vessels = []

  init({ ephemeris, currentTime, tMax, sites, vessels }) {
    this.ephemeris = ephemeris
    this.currentTime = currentTime
    this.tMax = tMax
    this.sites = sites
    this.vessels = vessels
    return this
  }

  static create(bodies, sites, bodyInitialStates) {
    return new Universe().init({
      ephemeris: Ephemeris.create({
        bodies,
        initialState: bodyInitialStates,
        step: 1 * 60,
      }),
      currentTime: 0,
      tMax: 0,
      sites,
      vessels: [],
    })
  }

  serialize(serialize) {
    return {
      ephemeris: serialize(this.ephemeris),
      currentTime: this.currentTime,
      tMax: this.tMax,
      sites: this.sites.map(ss => ss.map(serialize)),
      vessels: this.vessels.map(serialize),
    }
  }

  deserialize({ ephemeris, currentTime, tMax, sites, vessels }, deserialize) {
    this.init({
      ephemeris: deserialize(Ephemeris, ephemeris),
      currentTime,
      tMax,
      sites: sites.map(ss => ss.map(s => deserialize(Site, s))),
      vessels: vessels.map(v => deserialize(Vessel, v)),
    })
  }

  step(dt) {
    this.currentTime += dt
  }

  prolong(tMax) {
    let anyChanged = tMax !== this.tMax
    this.tMax = tMax
    this.ephemeris.prolong(tMax)
    this.vessels.forEach(v => {
      const lastSimulatedTime = v.trajectory.tMax
      for (const m of v.maneuvers) {
        if (m.startTime < lastSimulatedTime)
          continue
        if (m.endTime >= tMax)
          throw new Error("I haven't considered this case yet")
        anyChanged = true
        // Coast until maneuver start
        this.ephemeris.flowWithAdaptiveStep(v.trajectory, m.startTime)
        // Burn until maneuver end
        this.ephemeris.flowWithAdaptiveStep(v.trajectory, m.endTime, v.intrinsicAcceleration.bind(v))
      }
      if (v.trajectory.tMax < tMax) {
        // Coast until tMax
        this.ephemeris.flowWithAdaptiveStep(v.trajectory, tMax)
        anyChanged = true
      }
    })
    if (anyChanged)
      universeChanged()
  }
  limit(tMax) {
    if (tMax >= this.tMax)
      throw new Error("Can't limit to a time in the future")
    this.tMax = tMax
    universeChanged()
  }
  recompute() {
    this.prolong(this.tMax)
    universeChanged()
  }
}

export const universe = blankUniverse()

window.universe = universe

const subscribers = new Set
export function universeChanged() {
  for (const listener of subscribers)
    listener()
}

export function onUniverseChanged(listener) {
  subscribers.add(listener)
  return () => subscribers.delete(listener)
}
