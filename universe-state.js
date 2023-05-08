import { Ephemeris } from "./ephemeris.js"

const celestials = [
  { name: "Sun", mass: 1.98855e30, position: {x: 0, y: 0}, velocity: {x: 0, y: 0}, radius: 695700e3, color: "#ff0" },

  { name: "Mercury", mass: 3.3011e23, position: {x: 5.791e10, y: 0}, velocity: {x: 0, y: 47.362e3}, radius: 2439.7e3, color: "#aaa" },

  { name: "Venus", mass: 4.8675e24, position: {x: 1.0821e11, y: 0}, velocity: {x: 0, y: 35.02e3}, radius: 6051.8e3, color: "#ac8657" },

  { name: "Earth", mass: 5.97237e24, position: {x: 1.496e11, y: 0}, velocity: {x: 0, y: 29.78e3}, radius: 6371e3, color: "#00f" },

  { name: "Moon", mass: 7.34767309e22, position: {x: 1.496e11 + 3.844e8, y: 0}, velocity: {x: 0, y: 29.78e3 + 1022}, radius: 1737.4e3, color: "#ccc" },

  { name: "Mars", mass: 6.4171e23, position: {x: 2.2794e11, y: 0}, velocity: {x: 0, y: 24.077e3}, radius: 3389.5e3, color: "#ce8258" },

    { name: "Phobos", mass: 1.0659e16, position: {x: 2.2794e11 + 9.376e6, y: 0}, velocity: {x: 0, y: 24.077e3 + 2.138e3}, radius: 11.2667e3, color: "#967a6e" },
    { name: "Deimos", mass: 1.4762e15, position: {x: 2.2794e11 + 2.326e7, y: 0}, velocity: {x: 0, y: 24.077e3 + 1.351e3}, radius: 6.2e3, color: "#d7bb9a" },

  { name: "Jupiter", mass: 1.8986e27, position: {x: 7.7857e11, y: 0}, velocity: {x: 0, y: 13.07e3}, radius: 69911e3, color: "#f0f" },

    { name: "Callisto", mass: 1.075938e23, position: {x: 7.7857e11 + 1.883e9, y: 0}, velocity: {x: 0, y: 13.07e3 + 8204}, radius: 2410e3, color: "#f0f" },
    { name: "Io", mass: 8.931938e22, position: {x: 7.7857e11 + 4.21e8, y: 0}, velocity: {x: 0, y: 13.07e3 + 17200}, radius: 1821.6e3, color: "#f0f" },
    { name: "Europa", mass: 4.799844e22, position: {x: 7.7857e11 + 6.71e8, y: 0}, velocity: {x: 0, y: 13.07e3 + 13700}, radius: 1560.8e3, color: "#f0f" },
    { name: "Ganymede", mass: 1.4819e23, position: {x: 7.7857e11 + 1.07e9, y: 0}, velocity: {x: 0, y: 13.07e3 + 10800}, radius: 2634.1e3, color: "#f0f" },

  { name: "Saturn", mass: 5.6834e26, position: {x: 1.4335e12, y: 0}, velocity: {x: 0, y: 9.69e3}, radius: 58232e3, color: "#f0f" },

  { name: "Uranus", mass: 8.6810e25, position: {x: 2.8735e12, y: 0}, velocity: {x: 0, y: 6.81e3}, radius: 25362e3, color: "#f0f" },

  { name: "Neptune", mass: 1.0243e26, position: {x: 4.4951e12, y: 0}, velocity: {x: 0, y: 5.43e3}, radius: 24622e3, color: "#f0f" },

  { name: "Pluto", mass: 1.303e22, position: {x: 5.9064e12, y: 0}, velocity: {x: 0, y: 4.74e3}, radius: 1188.3e3, color: "#f0f" },

  { name: "Ceres", mass: 9.393e20, position: {x: 4.14e11, y: 0}, velocity: {x: 0, y: 17.9e3}, radius: 469.73e3, color: "#f0f" },
]

const initialSites = {
  Earth: [
    {
      name: "KSC",
      facilities: [
        {
          type: "manufactory",
        }
      ]
    },
  ],
}
for (const celestial of celestials) {
  celestial.sites = initialSites[celestial.name] || []
  for (const site of celestial.sites) {
    site.vessels = []
  }
}

const ephemeris = new Ephemeris({
  bodies: celestials,
  time: 0,
  step: 1 * 60,
  tolerance: 1e-3,
})

export const universe = {
  currentTime: 0,
  vessels: [],
  ephemeris,
}

window.universe = universe
