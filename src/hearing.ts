export type TrialKind = "pitch" | "control" | "blank";

export interface Trial {
  frequencies: [number, number, number];
  /** Position (0-2) of the tone that differs in pitch, or null when all
   * three tones are identical (blank trials — "can't tell" is correct). */
  oddIndex: number | null;
}

const REFERENCE_MIN_HZ = 500;
const REFERENCE_MAX_HZ = 3000;

// Fraction the odd tone's frequency differs from the other two.
const DELTA_BY_KIND: Record<TrialKind, number> = {
  pitch: 0.04,
  control: 0.25,
  blank: 0,
};

/**
 * Log-uniform rather than linear-uniform: pitch discrimination roughly
 * follows a constant proportional (Weber-law-like) threshold across the
 * audible range rather than a constant Hz threshold, so this keeps trial
 * difficulty comparable regardless of which reference frequency comes up.
 */
function randomReferenceFrequency(): number {
  const logMin = Math.log(REFERENCE_MIN_HZ);
  const logMax = Math.log(REFERENCE_MAX_HZ);
  return Math.exp(logMin + Math.random() * (logMax - logMin));
}

export function buildTrial(kind: TrialKind): Trial {
  const reference = randomReferenceFrequency();
  const delta = DELTA_BY_KIND[kind];

  if (delta === 0) {
    return { frequencies: [reference, reference, reference], oddIndex: null };
  }

  const direction = Math.random() < 0.5 ? 1 : -1;
  const oddFrequency = reference * (1 + direction * delta);
  const oddIndex = Math.floor(Math.random() * 3);

  const frequencies: [number, number, number] = [reference, reference, reference];
  frequencies[oddIndex] = oddFrequency;
  return { frequencies, oddIndex };
}
