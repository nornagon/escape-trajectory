// @ts-check

export type Vec2 = {
  x: number;
  y: number;
}

export type Ops<T> = {
  add: (a: T, b: T) => T;
  addi: (a: T, b: T) => T;
  sub: (a: T, b: T) => T;
  subi: (a: T, b: T) => T;
  scale: (a: T, b: number) => T;
  scalei: (a: T, b: number) => T;
  norm: (a: T) => number;
  norm2: (a: T) => number;
  dot: (a: T, b: T) => number;
  neg: (a: T) => T;
  len: (a: T) => number;
  normalize: (a: T) => T;
  perp: (a: T) => T;
  rotate: (a: T, b: number) => T;
  project: (a: T, b: T) => T;
  lerp: (a: T, b: T, t: number) => T;
  zero: T;
}
