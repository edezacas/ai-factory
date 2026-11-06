export function allocateDiscount(lineTotalsCents: number[], discountCents: number): number[] {
  const total = lineTotalsCents.reduce((sum, line) => sum + line, 0)
  if (discountCents < 0 || discountCents > total) throw new RangeError('Invalid discount')
  if (total === 0) return lineTotalsCents.map(() => 0)
  const shares = lineTotalsCents.map((line) => Math.floor((line * discountCents) / total))
  let left = discountCents - shares.reduce((sum, share) => sum + share, 0)
  const byRemainder = lineTotalsCents
    .map((line, index) => ({ index, remainder: (line * discountCents) % total }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
  for (const { index } of byRemainder) {
    if (left-- <= 0) break
    shares[index] += 1
  }
  return shares
}
