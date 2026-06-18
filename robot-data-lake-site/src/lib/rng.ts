export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed: number) {
  const r = mulberry32(seed);
  return {
    next: r,
    float: (min: number, max: number) => min + r() * (max - min),
    int: (min: number, max: number) => Math.floor(min + r() * (max - min + 1)),
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(r() * arr.length)],
    gauss: (mean: number, sd: number) => { const u = 1 - r(), v = r(); return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
    weighted: <T extends { weight: number }>(items: readonly T[]): T => {
      const total = items.reduce((s, it) => s + it.weight, 0); let x = r() * total;
      for (const it of items) { x -= it.weight; if (x <= 0) return it; } return items[items.length - 1];
    },
  };
}
