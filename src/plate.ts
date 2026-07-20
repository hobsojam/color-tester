import { type Deficiency, confusionPair, controlPair, jitterLightness, randomBaseColor, toCss } from "./color";

export type PlateSpec =
  | { kind: "confusion"; deficiency: Deficiency; digit: string }
  | { kind: "control"; digit: string };

export interface PlateRenderOptions {
  size?: number; // canvas pixels, square
}

/** Build a 1-bit mask (true = inside the digit) by rendering it to an
 * offscreen canvas and reading alpha. */
function buildDigitMask(digit: string, size: number): Uint8Array {
  const off = document.createElement("canvas");
  off.width = size;
  off.height = size;
  const ctx = off.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#000";
  ctx.font = `bold ${Math.round(size * 0.72)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(digit, size / 2, size / 2 + size * 0.02);

  const { data } = ctx.getImageData(0, 0, size, size);
  const mask = new Uint8Array(size * size);
  for (let i = 0; i < mask.length; i++) {
    mask[i] = data[i * 4 + 3] > 128 ? 1 : 0;
  }
  return mask;
}

/** Renders a colored-noise plate onto `canvas`.
 *
 * "confusion" plates encode the digit purely via a figure/ground color pair
 * that differs only along the cone axis `deficiency` cannot sense — invisible
 * to that deficiency, visible to trichromats.
 *
 * "control" plates use a large plain lightness gap instead, so the digit
 * should be visible to everyone regardless of color vision; these exist to
 * catch inattentive or random answering, not to test anything color-related.
 *
 * Either way, every noise cell's brightness is independently jittered so
 * luminance carries no shape information on its own, and cell radius is
 * randomized across a wide range (multi-scale/broadband) so the shape can't
 * leak through at a single spatial frequency.
 */
export function renderPlate(canvas: HTMLCanvasElement, spec: PlateSpec, options: PlateRenderOptions = {}): void {
  const size = options.size ?? 320;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const mask = buildDigitMask(spec.digit, size);
  const { figure, ground } =
    spec.kind === "control" ? controlPair() : confusionPair(randomBaseColor(), spec.deficiency, 0.06);

  // Background fill in case coverage misses any pixels at the edges.
  ctx.fillStyle = toCss(ground);
  ctx.fillRect(0, 0, size, size);

  const minR = size * 0.012;
  const maxR = size * 0.045;
  const avgArea = Math.PI * ((minR + maxR) / 2) ** 2;
  const coverage = 3.2; // draw enough overlapping cells to fully cover the canvas
  const cellCount = Math.ceil((size * size * coverage) / avgArea);

  for (let i = 0; i < cellCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = minR + Math.random() * (maxR - minR);

    const mx = Math.min(size - 1, Math.max(0, Math.round(x)));
    const my = Math.min(size - 1, Math.max(0, Math.round(y)));
    const inFigure = mask[my * size + mx] === 1;

    const jittered = jitterLightness(inFigure ? figure : ground, 0.22);
    ctx.beginPath();
    ctx.fillStyle = toCss(jittered);
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function randomDigit(exclude?: string): string {
  let d: string;
  do {
    d = String(Math.floor(Math.random() * 10));
  } while (d === exclude);
  return d;
}
