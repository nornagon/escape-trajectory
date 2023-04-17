function memoize(fn, makeKey = JSON.stringify) {
  const cache = new Map
  return function (...args) {
    const key = makeKey(args)
    if (cache.has(key)) return cache.get(key)
    const result = fn(...args)
    cache.set(key, result)
    return result
  }
}

function diag(v) {
  return v.map((x, i) => Array.from({ length: v.length }, (_, j) => i === j ? x : 0))
}

function mmul(a, b) {
  if (a[0].length !== b.length) {
    throw new Error(`Matrices are not compatible for multiplication (a: ${a.length}x${a[0].length}, b: ${b.length}x${b[0].length})`)
  }

  return a.map((rowA) => {
    return b[0].map((_, j) => {
      return rowA.reduce((sum, curr, k) => {
        return sum + curr * b[k][j];
      }, 0);
    });
  });
}

function mmulWithOps(ops, a, b) {
  if (a[0].length !== b.length) {
    throw new Error(`Matrices are not compatible for multiplication (a: ${a.length}x${a[0].length}, b: ${b.length}x${b[0].length})`)
  }

  return a.map((rowA) => {
    return b[0].map((_, j) => {
      return rowA.reduce((sum, curr, k) => {
        return ops.add(sum, ops.scale(b[k][j], curr));
      }, ops.zero);
    });
  });
}

function dotWithOps(ops, a, b) {
  if (a.length !== b.length) {
    throw new Error(`Vectors are not compatible for dot product (a: ${a.length}, b: ${b.length})`)
  }

  return a.reduce((sum, curr, i) => {
    return ops.add(sum, ops.scale(b[i], curr));
  }, ops.zero);
}

if (typeof require !== 'undefined') {
  const assert = require('assert');
  // Example 1
  const a = [[1, 2], [3, 4]];
  const b = [[5, 6], [7, 8]];
  const expected = [[19, 22], [43, 50]];
  assert.deepStrictEqual(mmul(a, b), expected);

  // Example 2
  const c = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const d = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
  const expected2 = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
  assert.deepStrictEqual(mmul(c, d), expected2);

  // Example 3
  const e = [[1, 2, 3], [4, 5, 6]];
  const f = [[7, 8], [9, 10], [11, 12]];
  const expected3 = [[58, 64], [139, 154]];
  assert.deepStrictEqual(mmul(e, f), expected3);
}


function transpose(a) {
  return a[0].map((_, i) => a.map(row => row[i]))
}

function inv(a) {
  const n = a.length
  a = Array.from({ length: n }, (_, i) => [...a[i]]);
  const b = diag(Array.from({ length: n }, () => 1))
  for (let i = 0; i < n; i++) {
    const pivot = a[i][i]
    if (pivot === 0) throw new Error("Matrix is not invertible")
    for (let j = 0; j < n; j++) {
      a[i][j] /= pivot
      b[i][j] /= pivot
    }
    for (let j = 0; j < n; j++) {
      if (i === j) continue
      const factor = a[j][i]
      for (let k = 0; k < n; k++) {
        a[j][k] -= factor * a[i][k]
        b[j][k] -= factor * b[i][k]
      }
    }
  }
  return b
}

if (typeof require !== 'undefined') {
  const assert = require('assert')

  // Example 1
  const a = [[1, 2], [3, 4]];
  const expected = [[-2, 1], [1.5, -0.5]];
  assert.deepStrictEqual(inv(a), expected);

  // Example 2
  const b = [[1, 2, 3], [0, 1, 4], [5, 6, 0]];
  const expected2 = [[-24, 18, 5], [20, -15, -4], [-5, 4, 1]];
  assert.deepStrictEqual(inv(b), expected2);
}


function chebyshevT(n, x) {
  if (n === 0) return 1
  if (n === 1) return x
  return 2 * x * chebyshevT(n - 1, x) - chebyshevT(n - 2, x)
}

function chebyshevU(n, x) {
  if (n < 0) throw new Error('n must be non-negative')
  if (n === 0) return 1
  if (n === 1) return 2 * x
  return 2 * x * chebyshevU(n - 1, x) - chebyshevU(n - 2, x)
}

function dchebyshevT(n, x) {
  if (n === 0) return 0
  return n * chebyshevU(n - 1, x)
}

const chebyshevCoeffs = memoize(function chebyshevCoeffs(n) {
  if (n === 0) return [1]
  if (n === 1) return [0, 1]

  const nm1 = chebyshevCoeffs(n - 1)
  const nm2 = chebyshevCoeffs(n - 2)
  const nm1_2x = [0].concat(nm1.map((x) => x * 2))
  const nm2_inv = nm2.map((x) => -x)
  const sum = nm1_2x.map((x, i) => x + (nm2_inv[i] ?? 0))

  return sum
}, (args) => args[0])

if (typeof require !== 'undefined') {
  const assert = require('assert')
  assert.deepStrictEqual(chebyshevCoeffs(0), [1]);
  assert.deepStrictEqual(chebyshevCoeffs(1), [0, 1]);
  assert.deepStrictEqual(chebyshevCoeffs(2), [-1, 0, 2]);
  assert.deepStrictEqual(chebyshevCoeffs(3), [0, -3, 0, 4]);
  assert.deepStrictEqual(chebyshevCoeffs(4), [1, 0, -8, 0, 8]);
}

function chebyshevCoeff(n, k) {
  return chebyshevCoeffs(n)[k] ?? 0
}

function newhallT(degree, divisions) {
  const rows = []
  for (let i = 0; i <= divisions; i++) {
    const j = 1 - 2 * i / divisions

    rows.push(
      Array.from({ length: degree + 1 }, (_, i) => chebyshevT(i, j)),
      Array.from({ length: degree + 1 }, (_, i) => dchebyshevT(i, j))
    )
  }
  return rows
}

function newhallW(divisions, w = 0.4) {
  return diag(Array.from({ length: (divisions + 1) * 2 }, (_, i) => i % 2 ? w*w : 1))
}

function newhallC1UpperLeft(degree, divisions, w = 0.4) {
  return mmul(
    mmul(transpose(newhallT(degree, divisions)), newhallW(divisions, w)),
    newhallT(degree, divisions)
  )
}

function newhallC1UpperRight(degree) {
  return Array.from({ length: degree + 1 }, (_, i) => [chebyshevT(i, 1), dchebyshevT(i, 1), chebyshevT(i, -1), dchebyshevT(i, -1)])
}

function newhallC1LowerLeft(degree) {
  return transpose(newhallC1UpperRight(degree))
}

function newhallC1LowerRight() {
  return Array.from({ length: 4 }, () => [0, 0, 0, 0])
}

function concat(a, b) {
  return a.map((row, i) => row.concat(b[i]))
}

function newhallC1(degree, divisions, w = 0.4) {
  return [
    ...concat(newhallC1UpperLeft(degree, divisions, w), newhallC1UpperRight(degree)),
    ...concat(newhallC1LowerLeft(degree), newhallC1LowerRight()),
  ]
}

function newhallC2Upper(degree, divisions, w = 0.4) {
  return mmul(transpose(newhallT(degree, divisions)), newhallW(divisions, w))
}

function newhallC2Lower(divisions) {
  return [
    [1].concat(Array.from({ length: divisions * 2 + 1 }, () => 0)),
    [0, 1].concat(Array.from({ length: divisions * 2 }, () => 0)),
    Array.from({ length: divisions * 2 }, () => 0).concat([1, 0]),
    Array.from({ length: divisions * 2 + 1 }, () => 0).concat([1]),
  ]
}

function newhallC2(degree, divisions, w = 0.4) {
  return [
    ...newhallC2Upper(degree, divisions, w),
    ...newhallC2Lower(divisions),
  ]
}

const newhallC = memoize(function (degree, divisions, w = 0.4) {
  return mmul(
    inv(newhallC1(degree, divisions, w)),
    newhallC2(degree, divisions, w)
  )
}, (degree, divisions, w) => degree*1000 + divisions + w)

// A function that behaves like Mathematica's Table[]
function table(fn, start, end, step = 1) {
  const result = []
  for (let i = start; i <= end; i += step) {
    result.push(fn(i))
  }
  return result
}
// A function that behaves like Mathematica's Sum[]
function sum(fn, add, start, end, step = 1) {
  let result = null
  for (let i = start; i <= end; i += step) {
    if (result === null) result = fn(i)
    else result = add(result, fn(i))
  }
  return result
}

function scale(a, s) {
  return a.map((x) => x * s)
}

const newhallMonomialC = memoize(function (degree, divisions, w = 0.4) {
  const c = newhallC(degree, divisions, w)

  return table((k) =>
    sum((n) => scale(c[n], chebyshevCoeff(n, k)), (a, b) => a.map((x, i) => x + b[i]), 0, degree),
    0, degree
  )
}, (degree, divisions, w) => degree*1000 + divisions + w)

export function newhallApproximationInChebyshevBasis(degree, divisions, q, v, tMin, tMax) {
  if (q.length !== divisions + 1) throw new Error('q length mismatch')
  if (v.length !== divisions + 1) throw new Error('v length mismatch')
  const durationOverTwo = (tMax - tMin) / 2

  const qv = Array(2 * divisions + 2)
  for (let i = 0, j = 2 * divisions; i < divisions + 1 && j >= 0; ++i, j -= 2) {
    qv[j] = q[i]
    qv[j + 1] = v[i] * durationOverTwo
  }

  const coefficients = mmul(newhallC(degree, divisions).slice(0, -4), transpose([qv])).map(x => x[0])
  if (coefficients.length !== degree + 1) throw new Error('coefficients length mismatch')
  const errorEstimate = coefficients[degree];
  return {
    coefficients,
    errorEstimate,
  }
}

function homogeneousCoefficients(degree, divisions, ops, qv) {
  const cRow = newhallC(degree, divisions)[degree - 1]
  const errorEstimate = dotWithOps(ops, cRow, qv)
  return {
    coefficients: mmulWithOps(ops, newhallMonomialC(degree - 1, divisions), transpose([qv])),
    errorEstimate,
  }
}

function dehomogenize(ops, coefficients, scale, origin) {
  return new Polynomial(ops, coefficients.map((x, i) => ops.scale(x, scale ** i)), origin)
}

export function newhallApproximationInMonomialBasis(degree, divisions, ops, q, v, tMin, tMax) {
  if (q.length !== divisions + 1) throw new Error('q length mismatch')
  if (v.length !== divisions + 1) throw new Error('v length mismatch')

  const durationOverTwo = (tMax - tMin) / 2

  const qv = Array(2 * divisions + 2)
  for (let i = 0, j = 2 * divisions; i < divisions + 1 && j >= 0; ++i, j -= 2) {
    qv[j] = q[i]
    qv[j + 1] = ops.scale(v[i], durationOverTwo)
  }

  const tMid = (tMin + tMax) / 2
  const { coefficients, errorEstimate } = homogeneousCoefficients(degree, divisions, ops, qv)
  return {
    polynomial: dehomogenize(ops, transpose(coefficients)[0], 1 / durationOverTwo, tMid),
    errorEstimate,
  }
}

class Polynomial {
  #ops
  #coefficients
  #origin

  constructor(ops, coefficients, origin) {
    this.#ops = ops
    this.#coefficients = coefficients
    this.#origin = origin
  }

  evaluate(arg) {
    const t = arg - this.#origin
    return this.#coefficients.reduce((acc, c, i) => this.#ops.add(acc, this.#ops.scale(c, t ** i)), this.#ops.zero)
  }
}

/*
function evalCheb(coeffs, t) {
  return coeffs.reduce((acc, c, i) => acc + c * chebyshevT(i, t), 0)
}

const cheb = newhallApproximationInChebyshevBasis(3, 2, [1, 2, 3], [1, 1, 1], 0, 1)
console.log(cheb)
console.log(evalCheb(cheb.coefficients, -1))
console.log(evalCheb(cheb.coefficients, -0.5))
console.log(evalCheb(cheb.coefficients, 0))
console.log(evalCheb(cheb.coefficients, 0.5))
console.log(evalCheb(cheb.coefficients, 1))

const mono = newhallApproximationInMonomialBasis(3, 2, [1, 2, 3], [1, 1, 1], 1, 2)
console.log(mono)
console.log(mono.polynomial.evaluate(1));
console.log(mono.polynomial.evaluate(2));
*/
