// Color-vision-deficiency math.
//
// A plate is "readable by trichromats but hidden from deficiency X" when its
// figure and ground colors differ ONLY along the cone axis that deficiency X
// can't sense:
//   protan (no functional L cones) -> vary L, hold M and S fixed
//   deutan (no functional M cones) -> vary M, hold L and S fixed
//   tritan (no functional S cones) -> vary S, hold L and M fixed
//
// Conversion matrices are the standard sRGB<->XYZ (D65) and Hunt-Pointer-
// Estevez XYZ<->LMS matrices used throughout CVD-simulation literature
// (e.g. Viénot/Brettel/Machado). Precision is more than sufficient for a
// non-diagnostic screening tool.

export type Deficiency = "protan" | "deutan" | "tritan";

export interface Rgb {
  r: number; // 0..1
  g: number;
  b: number;
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return v;
}

// linear sRGB -> XYZ (D65)
const RGB_TO_XYZ = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.072175],
  [0.0193339, 0.119192, 0.9503041],
] as const;

// XYZ -> linear sRGB
const XYZ_TO_RGB = [
  [3.2404542, -1.5371385, -0.4985314],
  [-0.969266, 1.8760108, 0.041556],
  [0.0556434, -0.2040259, 1.0572252],
] as const;

// XYZ -> LMS (Hunt-Pointer-Estevez)
const XYZ_TO_LMS = [
  [0.40024, 0.7076, -0.08081],
  [-0.2263, 1.16532, 0.0457],
  [0.0, 0.0, 0.91822],
] as const;

// LMS -> XYZ (inverse of above)
const LMS_TO_XYZ = [
  [1.8599364, -1.1293816, 0.2198974],
  [0.3611914, 0.6388125, -0.0000064],
  [0.0, 0.0, 1.0890636],
] as const;

function apply(m: readonly (readonly number[])[], v: [number, number, number]): [number, number, number] {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

export interface Lms {
  l: number;
  m: number;
  s: number;
}

export function rgbToLms(rgb: Rgb): Lms {
  const lin: [number, number, number] = [
    srgbToLinear(rgb.r),
    srgbToLinear(rgb.g),
    srgbToLinear(rgb.b),
  ];
  const xyz = apply(RGB_TO_XYZ, lin);
  const [l, m, s] = apply(XYZ_TO_LMS, xyz);
  return { l, m, s };
}

export function lmsToRgb(lms: Lms): Rgb {
  const xyz = apply(LMS_TO_XYZ, [lms.l, lms.m, lms.s]);
  const lin = apply(XYZ_TO_RGB, xyz as [number, number, number]);
  return {
    r: linearToSrgb(lin[0]),
    g: linearToSrgb(lin[1]),
    b: linearToSrgb(lin[2]),
  };
}

function inGamut(rgb: Rgb): boolean {
  const eps = 1e-4;
  return (
    rgb.r >= -eps && rgb.r <= 1 + eps &&
    rgb.g >= -eps && rgb.g <= 1 + eps &&
    rgb.b >= -eps && rgb.b <= 1 + eps
  );
}

export function clamp01(rgb: Rgb): Rgb {
  return {
    r: Math.min(1, Math.max(0, rgb.r)),
    g: Math.min(1, Math.max(0, rgb.g)),
    b: Math.min(1, Math.max(0, rgb.b)),
  };
}

export interface ConfusionPair {
  figure: Rgb;
  ground: Rgb;
}

/**
 * Given a base sRGB color, produce a figure/ground pair that differs only
 * along the cone axis `deficiency` cannot sense. `delta` is the requested
 * step size in LMS space; it's shrunk via binary search if the requested
 * step would push either color out of the sRGB gamut.
 */
export function confusionPair(base: Rgb, deficiency: Deficiency, delta = 0.05): ConfusionPair {
  const lms = rgbToLms(base);
  const axis = deficiency === "protan" ? "l" : deficiency === "deutan" ? "m" : "s";

  let d = delta;
  let figure: Rgb;
  let ground: Rgb;
  for (let i = 0; i < 24; i++) {
    const plus: Lms = { ...lms, [axis]: lms[axis] + d };
    const minus: Lms = { ...lms, [axis]: lms[axis] - d };
    figure = lmsToRgb(plus);
    ground = lmsToRgb(minus);
    if (inGamut(figure) && inGamut(ground)) break;
    d *= 0.75;
  }
  return { figure: clamp01(figure!), ground: clamp01(ground!) };
}

/** Random hue/lightness base color, biased toward mid saturation/lightness
 * (extremes leave little gamut headroom for the confusion-pair offset). */
export function randomBaseColor(): Rgb {
  const h = Math.random() * 360;
  const s = 0.45 + Math.random() * 0.25;
  const l = 0.45 + Math.random() * 0.15;
  return hslToRgb(h, s, l);
}

/** Figure/ground pair for a "control" plate: a large plain lightness gap
 * (not an isochromatic confusion pair), so the digit should be visible via
 * brightness contrast alone, regardless of color vision. Used to sanity-check
 * that the viewer is actually engaging with the test. */
export function controlPair(): ConfusionPair {
  const h = Math.random() * 360;
  const s = 0.5 + Math.random() * 0.3;
  const light = hslToRgb(h, s, 0.8 + Math.random() * 0.12);
  const dark = hslToRgb(h, s, 0.14 + Math.random() * 0.12);
  return Math.random() < 0.5 ? { figure: light, ground: dark } : { figure: dark, ground: light };
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: r + m, g: g + m, b: b + m };
}

/** Jitter perceived lightness of a color by up to `amount` (0..1), used per
 * noise-cell so brightness carries no shape information. */
export function jitterLightness(rgb: Rgb, amount: number): Rgb {
  const jitter = (Math.random() * 2 - 1) * amount;
  const scale = 1 + jitter;
  return clamp01({ r: rgb.r * scale, g: rgb.g * scale, b: rgb.b * scale });
}

export function toCss(rgb: Rgb): string {
  const r = Math.round(clamp01(rgb).r * 255);
  const g = Math.round(clamp01(rgb).g * 255);
  const b = Math.round(clamp01(rgb).b * 255);
  return `rgb(${r}, ${g}, ${b})`;
}
