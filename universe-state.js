import { Ephemeris } from "./ephemeris.js"
import { useState, useEffect, useLayoutEffect } from 'preact/hooks'

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
    {
      name: "KSC",
      facilities: [
        {
          type: "manufactory",
        }
      ],
      vessels: [],
      resources: {},
    },
  ],
}
const sites = bodies.map(b => sitesByName[b.name] || [])

const Second = 1
const Minute = 60 * Second
const Hour = 60 * Minute
const Day = 24 * Hour
const Month = 30 * Day

export const universe = {
  currentTime: 0,
  ephemeris: new Ephemeris({
    bodies,
    initialState: bodyInitialStates,
    step: 1 * 60,
  }),
  sites,
  vessels: [],
  simUntil(t) {
    const tMax = this.ephemeris.tMax
    const newTMax = t + 14 * Hour
    if (newTMax > tMax) {
      this.ephemeris.prolong(newTMax)
      //trajectoryBBTrees = new WeakMap
    }
    this.vessels.forEach(v => {
      for (const m of v.maneuvers) {
        const lastSimulatedTime = v.trajectory.tMax
        if (m.startTime < lastSimulatedTime)
          continue
        // Coast until maneuver start
        this.ephemeris.flowWithAdaptiveStep(v.trajectory, m.startTime)
        // Burn until maneuver end
        this.ephemeris.flowWithAdaptiveStep(v.trajectory, m.endTime, v.intrinsicAcceleration.bind(v))
      }
      // Coast until tMax
      this.ephemeris.flowWithAdaptiveStep(v.trajectory, tMax)
    })
    this.currentTime = t
    universeChanged()
  },
}

window.universe = universe

/**
 * Check if two values are the same value
 * @param {*} x
 * @param {*} y
 * @returns {boolean}
 */
export function is(x, y) {
	return (x === y && (x !== 0 || 1 / x === 1 / y)) || (x !== x && y !== y);
}

/**
 * This is taken from https://github.com/facebook/react/blob/main/packages/use-sync-external-store/src/useSyncExternalStoreShimClient.js#L84
 * on a high level this cuts out the warnings, ... and attempts a smaller implementation
 */
export function useSyncExternalStore(subscribe, getSnapshot) {
	const value = getSnapshot();

	const [{ _instance }, forceUpdate] = useState({
		_instance: { _value: value, _getSnapshot: getSnapshot }
	});

	useLayoutEffect(() => {
		_instance._value = value;
		_instance._getSnapshot = getSnapshot;

		if (!is(_instance._value, getSnapshot())) {
			forceUpdate({ _instance });
		}
	}, [subscribe, value, getSnapshot]);

	useEffect(() => {
		if (!is(_instance._value, _instance._getSnapshot())) {
			forceUpdate({ _instance });
		}

		return subscribe(() => {
			if (!is(_instance._value, _instance._getSnapshot())) {
				forceUpdate({ _instance });
			}
		});
	}, [subscribe]);

	return value;
}

let currentUniverse = { universe }
const subscribers = new Set
export function useUniverse() {
  return useSyncExternalStore(
    onUniverseChanged,
    () => currentUniverse,
  ).universe
}

export function universeChanged() {
  currentUniverse = { universe }
  console.log('universe changed', subscribers.size)
  for (const listener of subscribers)
    listener()
}

export function onUniverseChanged(listener) {
  subscribers.add(listener)
  return () => subscribers.delete(listener)
}