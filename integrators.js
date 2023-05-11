// @ts-check

/** @typedef { import("./types").Vec2 } Vec2 */
/**
 * @template T
 * @typedef { import("./types").Ops<T> } Ops<T> */

/**
 * @typedef {Object} EmbeddedExplicitRungeKuttaNyströmMethod
 * @property {number} higher_order
 * @property {number} lower_order
 * @property {number} stages
 * @property {boolean} first_same_as_last
 * @property {Array<number>} c
 * @property {FixedStrictlyLowerTriangularMatrix} a
 * @property {Array<number>} b̂
 * @property {Array<number>} b̂ʹ
 * @property {Array<number>} b
 * @property {Array<number>} bʹ
 */

/**
 * @typedef {Object} SymmetricLinearMultistepMethod
 * @property {Array<number>} alpha
 * @property {Array<number>} beta_numerator
 * @property {number} beta_denominator
 */

class FixedStrictlyLowerTriangularMatrix {
  #data
  /**
   * @param {Array<number>} data
   */
  constructor(data) {
    this.#data = data
  }

  /**
   * @param {number} i
   * @param {number} j
   * @returns {number}
   */
  get(i, j) {
    return this.#data[i * (i - 1) / 2 + j]
  }
}

/** @type {EmbeddedExplicitRungeKuttaNyströmMethod} */
export const DormandالمكاوىPrince1986RKN434FM = {
  higher_order: 4,
  lower_order: 3,
  stages: 4,
  first_same_as_last: true,
  c: [0.0, 1.0 / 4.0, 7.0 / 10.0, 1.0],
  a: new FixedStrictlyLowerTriangularMatrix([
    1.0 / 32.0,
    7.0 / 1000.0, 119.0 / 500.0,
    1.0 / 14.0, 8.0 / 27.0, 25.0 / 189.0
  ]),
  b̂: [1.0 / 14.0, 8.0 / 27.0, 25.0 / 189.0, 0.0],
  b̂ʹ: [1.0 / 14.0, 32.0 / 81.0, 250.0 / 567.0, 5.0 / 54.0],
  b: [-7.0 / 150.0, 67.0 / 150.0, 3.0 / 20.0, -1.0 / 20.0],
  bʹ: [13.0 / 21.0, -20.0 / 27.0, 275.0 / 189.0, -1.0 / 3.0]
}

function twoSum(a, b) {
  const s = a + b;
  const v = s - a;
  return new DoublePrecision(s, (a - (s - v)) + (b - v));
}
function quickTwoSum(a, b) {
  const s = a + b;
  return new DoublePrecision(s, b - (s - a));
}
class DoublePrecision {
  /**
   * @param {number} value
   * @param {number} error
   */
  constructor(value, error = 0) {
    this.value = value;
    this.error = error;
  }

  /**
   * @param {DoublePrecision} other
   */
  add(other) {
    const sum = twoSum(this.value, other.value);
    return quickTwoSum(sum.value, (sum.error + this.error) + other.error)
  }

  /**
   * @param {number} v
   */
  increment(v) {
    const tmp = this.value;
    const y = this.error + v;
    this.value = tmp + y;
    this.error = (tmp - this.value) + y;
  }
}

function twoSumOps(ops, a, b) {
  const s = ops.add(a, b);
  const v = ops.sub(s, a);
  return new DoublePrecisionOps(ops, s, ops.add(ops.sub(a, ops.sub(s, v)), ops.sub(b, v)));
}
function quickTwoSumOps(ops, a, b) {
  const s = ops.add(a, b);
  return new DoublePrecisionOps(ops, s, ops.sub(b, ops.sub(s, a)));
}
/**
 * @template T
 */
class DoublePrecisionOps {
  #ops
  /**
   * @param {Ops<T>} ops
   * @param {T} value
   * @param {T} error
   */
  constructor(ops, value, error) {
    this.#ops = ops
    /** @type {T} */
    this.value = value;
    /** @type {T} */
    this.error = error;
  }

  /**
   * @param {DoublePrecisionOps<T>} other
   * @returns {DoublePrecisionOps<T>}
   */
  add(other) {
    const sum = twoSumOps(this.#ops, this.value, other.value);
    return quickTwoSumOps(this.#ops, sum.value, this.#ops.add(this.#ops.add(sum.error, this.error), other.error))
  }

  /**
   * @param {T} v
   */
  increment(v) {
    const tmp = this.value;
    const y = this.#ops.add(this.error, v);
    this.value = this.#ops.add(tmp, y);
    this.error = this.#ops.add(this.#ops.sub(tmp, this.value), y);
  }
}

/**
 * @template T
 */
export class ODEState {
  /** @type {Ops<T>} */
  #ops
  /** @type {DoublePrecision} */
  #time
  /** @type {Array<DoublePrecisionOps<T>>} */
  #positions
  /** @type {Array<DoublePrecisionOps<T>>} */
  #velocities

  /**
   * @param {Ops<T>} ops
   * @param {number} time
   * @param {Array<T>} positions
   * @param {Array<T>} velocities
   */
  constructor(ops, time, positions, velocities) {
    this.#ops = ops
    this.#time = new DoublePrecision(time);
    this.#positions = positions.map(p => new DoublePrecisionOps(ops, p, ops.zero));
    this.#velocities = velocities.map(v => new DoublePrecisionOps(ops, v, ops.zero));
  }

  get time() {
    return this.#time;
  }

  get positions() {
    return this.#positions;
  }

  get velocities() {
    return this.#velocities;
  }

  clone() {
    const s = new ODEState(this.#ops, 0, [], [])
    s.copyFrom(this)
    return s;
  }

  /**
   * @param {ODEState<T>} other
   */
  copyFrom(other) {
    this.#time = other.#time;
    this.#positions = other.#positions.slice();
    this.#velocities = other.#velocities.slice();
  }
}

/**
 * @see https://github.com/mockingbirdnest/Principia/blob/7b93a3b06cbd3787ff2697d9bd57d1c77ddd9968/integrators/embedded_explicit_runge_kutta_integrator_body.hpp#L48
 * @template T
 * @param {Ops<T>} ops
 * @param {{
 *   currentState: ODEState<T>,
 *   parameters: {
 *     firstStep: number,
 *     safetyFactor: number,
 *     maxSteps: number,
 *     lastStepIsExact: boolean
 *   },
 *   computeAccelerations: (t: number, q: Array<T>, a: Array<T>) => void,
 *   step: number,
 *   appendState: (state: ODEState<T>) => void,
 *   toleranceToErrorRatio: (h: number, currentState: ODEState<T>, errorEstimate: { positionError: Array<T>, velocityError: Array<T> }) => number
 * }} instance
 * @param {EmbeddedExplicitRungeKuttaNyströmMethod} method
 * @param {number} tFinal
 */
export function solveEmbeddedExplicitRungeKuttaNyström(ops, instance, method, tFinal) {
  const { a, b̂, b, b̂ʹ, bʹ, c } = method;
  const { appendState, currentState, parameters, computeAccelerations } = instance

  // State before the last, truncated step.
  let finalState;

  const dimension = currentState.positions.length;
  const integrationDirection = Math.sign(parameters.firstStep);

  // Position increment (high-order).
  const dq̂ = Array.from({ length: dimension }, () => ops.zero);
  // Velocity increment (high-order).
  const dv̂ = Array.from({ length: dimension }, () => ops.zero);
  // Current position.
  const q̂ = currentState.positions;
  // Current velocity.
  const v̂ = currentState.velocities;

  // Difference between the low- and high-order approximations.
  const errorEstimate = {
    positionError: Array.from({ length: dimension }, () => ops.zero),
    velocityError: Array.from({ length: dimension }, () => ops.zero),
  }

  // Current Runge-Kutta-Nyström stage.
  const qStage = Array.from({ length: dimension }, () => ops.zero);
  // Accelerations at each stage.
  const g = Array.from({ length: method.stages }, () => Array.from({ length: dimension }, () => ops.zero));

  let atEnd = false;
  let toleranceToErrorRatio = NaN;

  // The first stage of the Runge-Kutta-Nyström iteration.  In the FSAL case,
  // |first_stage == 1| after the first step, since the first RHS evaluation has
  // already occurred in the previous step.  In the non-FSAL case and in the
  // first step of the FSAL case, |first_stage == 0|.
  let firstStage = 0;

  // The number of steps already performed.
  let stepCount = 0;

  // No step size control on the first step.  If this instance is being
  // restarted we already have a value of |h| suitable for the next step, based
  // on the computation of |tolerance_to_error_ratio_| during the last
  // invocation.
  let skipFirstChunk = true;

  while (!atEnd) {
    // Compute the next step with decreasing step sizes until the error is
    // tolerable.
    do {
      if (!skipFirstChunk) {
        // Adapt step size.
        instance.step *= parameters.safetyFactor * Math.pow(toleranceToErrorRatio, 1 / (method.lower_order + 1));

        if (currentState.time.value + (currentState.time.error + instance.step) === currentState.time.value) {
          throw new Error("At time " + currentState.time.value + ", step size is effectively zero. Singularity or stiff system suspected.");
        }
      }
      skipFirstChunk = false;

      // Termination condition.
      if (parameters.lastStepIsExact) {
        const timeToEnd = (tFinal - currentState.time.value) - currentState.time.error;
        atEnd = integrationDirection * instance.step >= integrationDirection * timeToEnd;
        if (atEnd) {
          // The chosen step size will overshoot.  Clip it to just reach the
          // end, and terminate if the step is accepted.  Note that while this
          // step size is a good approximation, there is no guarantee that it
          // won't over/undershoot, so we still need to special case the very
          // last stage below.
          instance.step = timeToEnd;
          finalState = currentState.clone();
        }
      }

      const h2 = instance.step * instance.step;

      // Runge-Kutta-Nyström iteration; fills |g|.
      for (let i = firstStage; i < method.stages; i++) {
        const tStage = parameters.lastStepIsExact && atEnd && c[i] === 1
          ? tFinal
          : currentState.time.value + (currentState.time.error + c[i] * instance.step);
        for (let k = 0; k < dimension; k++) {
          let acc = ops.zero;
          for (let j = 0; j < i; j++) {
            acc = ops.add(acc, ops.scale(g[j][k], a.get(i, j)));
          }
          qStage[k] = ops.add(ops.add(q̂[k].value, ops.scale(v̂[k].value, instance.step * c[i])), ops.scale(acc, h2));
        }
        computeAccelerations(tStage, qStage, g[i]);
      }

      // Increment computation and step size control.
      for (let k = 0; k < dimension; k++) {
        let Σᵢ_b̂ᵢ_gᵢₖ = ops.zero;
        let Σᵢ_bᵢ_gᵢₖ = ops.zero;
        let Σᵢ_b̂ʹᵢ_gᵢₖ = ops.zero;
        let Σᵢ_bʹᵢ_gᵢₖ = ops.zero;
        for (let i = 0; i < method.stages; i++) {
          Σᵢ_b̂ᵢ_gᵢₖ = ops.add(Σᵢ_b̂ᵢ_gᵢₖ, ops.scale(g[i][k], b̂[i]));
          Σᵢ_bᵢ_gᵢₖ = ops.add(Σᵢ_bᵢ_gᵢₖ, ops.scale(g[i][k], b[i]));
          Σᵢ_b̂ʹᵢ_gᵢₖ = ops.add(Σᵢ_b̂ʹᵢ_gᵢₖ, ops.scale(g[i][k], b̂ʹ[i]));
          Σᵢ_bʹᵢ_gᵢₖ = ops.add(Σᵢ_bʹᵢ_gᵢₖ, ops.scale(g[i][k], bʹ[i]));
        }
        // The hat-less dq and dv are the low-order increments.
        dq̂[k] = ops.add(ops.scale(v̂[k].value, instance.step), ops.scale(Σᵢ_b̂ᵢ_gᵢₖ, h2));
        const dqk = ops.add(ops.scale(v̂[k].value, instance.step), ops.scale(Σᵢ_bᵢ_gᵢₖ, h2));
        dv̂[k] = ops.scale(Σᵢ_b̂ʹᵢ_gᵢₖ, instance.step);
        const dvk = ops.scale(Σᵢ_bʹᵢ_gᵢₖ, instance.step);

        errorEstimate.positionError[k] = ops.sub(dqk, dq̂[k]);
        errorEstimate.velocityError[k] = ops.sub(dvk, dv̂[k]);
      }

      toleranceToErrorRatio = instance.toleranceToErrorRatio(instance.step, currentState, errorEstimate);
    } while (toleranceToErrorRatio < 1.0);

    if (!parameters.lastStepIsExact && currentState.time.value + (currentState.time.error + instance.step) >= tFinal) {
      // We did overshoot.  Drop the point that we just computed and exit.
      finalState = currentState.clone();
      break;
    }

    if (method.first_same_as_last) {
      const tmp = g[0]
      g[0] = g[g.length - 1];
      g[g.length - 1] = tmp;
      firstStage = 1;
    }

    // Increment the solution with the high-order approximation.
    currentState.time.increment(instance.step);
    for (let k = 0; k < dimension; k++) {
      q̂[k].increment(dq̂[k]);
      v̂[k].increment(dv̂[k]);
    }

    appendState(currentState);
    stepCount++;
    if (stepCount === parameters.maxSteps && !atEnd) {
      throw new Error("Reached maximum step count " + parameters.maxSteps + " at time " + currentState.time.value + "; requested tFinal is " + tFinal + ".");
    }
  }
  if (!finalState)
    throw new Error("!finalState");
  currentState.copyFrom(finalState);
}

/**
 * @see https://github.com/mockingbirdnest/Principia/blob/7b93a3b06cbd3787ff2697d9bd57d1c77ddd9968/integrators/embedded_explicit_runge_kutta_integrator_body.hpp#L48
 * @template T
 * @param {Ops<T>} ops
 * @param {{
 *   currentState: ODEState<T>,
 *   parameters: {
 *     firstStep: number,
 *     safetyFactor: number,
 *     maxSteps: number,
 *     lastStepIsExact: boolean
 *   },
 *   computeAccelerations: (t: number, q: Array<T>, a: Array<T>) => void,
 *   step: number,
 *   appendState: (state: ODEState<T>) => void,
 *   toleranceToErrorRatio: (h: number, currentState: ODEState<T>, errorEstimate: { positionError: Array<T>, velocityError: Array<T> }) => number
 * }} instance
 * @param {SymmetricLinearMultistepMethod} method
 * @param {number} tFinal
 */
export function solveSymmetricLinearMultistep(ops, instance, method, tFinal) {
  const { alpha, beta_numerator, beta_denominator } = method;
}
