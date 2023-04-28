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
  zero: T;
}
