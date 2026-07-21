/**
 * shuffle.js — Fisher-Yates shuffle using a caller-supplied RNG.
 * Pure and reusable: takes any array + random function, returns a shuffled copy.
 */
export function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
