export function pickIndex(
  count: number,
  random: () => number = Math.random,
): number {
  if (count <= 0) return 0

  const value = Math.min(0.999999, Math.max(0, random()))
  return Math.floor(value * count)
}
