// Deterministic RNG + seeded noise — codex style
export function stringSeed(value){
  let hash = 2166136261 >>> 0;
  for(let i=0;i<value.length;i++){
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
export function makeRng(seedStr){
  let s = stringSeed(seedStr + '-runtime');
  return ()=> {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
export function hash32(v) {
  v = v | 0;
  v = Math.imul(v ^ (v >>> 16), 0x85ebca6b);
  v = Math.imul(v ^ (v >>> 13), 0xc2b2ae35);
  return (v ^ (v >>> 16)) >>> 0;
}

export function seededNoise(seed, q, r, salt=0){
  // NOTE: `seed` must be an integer (the output of stringSeed(seedText)).
  // Passing the raw seed string coerces to NaN in the xor and always yields 0.
  let x = seed + Math.imul(q + 101, 374761393) + Math.imul(r - 47, 668265263) + Math.imul(salt + 13, 362437);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
