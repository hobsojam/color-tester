function combinations(n: number, k: number): number {
  let res = 1;
  for (let i = 0; i < k; i++) res = (res * (n - i)) / (i + 1);
  return res;
}

function binomialPmf(k: number, n: number, p: number): number {
  return combinations(n, k) * p ** k * (1 - p) ** (n - k);
}

function binomialCdf(k: number, n: number, p: number): number {
  let sum = 0;
  for (let i = 0; i <= k; i++) sum += binomialPmf(i, n, p);
  return sum;
}

/** Assumed per-plate accuracy of someone who genuinely perceives the
 * figure/ground hue difference (allows for the occasional misread). */
const SIGHTED_ACCURACY = 0.9;

const SIGNIFICANCE = 0.05;

/**
 * Each plate has a 1-in-10 chance of being "solved" by a pure random digit
 * guess, so a genuinely sighted viewer should score far above that. This
 * flags a score as statistically indistinguishable from guessing — too low
 * to plausibly come from someone who could actually see the digits (p <
 * SIGNIFICANCE under the sighted-accuracy assumption) — rather than
 * comparing it against how other axes happened to score.
 */
export function isConsistentWithChanceGuessing(correct: number, total: number): boolean {
  return binomialCdf(correct, total, SIGHTED_ACCURACY) < SIGNIFICANCE;
}
