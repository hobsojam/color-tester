const FADE_SECONDS = 0.015; // avoids audible clicks from an instant on/off discontinuity
const GAIN = 0.2;

let sharedContext: AudioContext | null = null;

/**
 * Must be called from within a user-gesture handler (e.g. a click) the first
 * time, per browser autoplay policy — reuses one AudioContext for the whole
 * test rather than creating one per tone.
 */
export function getAudioContext(): AudioContext {
  if (!sharedContext) {
    sharedContext = new AudioContext();
  }
  if (sharedContext.state === "suspended") {
    void sharedContext.resume();
  }
  return sharedContext;
}

function scheduleTone(ctx: AudioContext, frequency: number, durationSeconds: number, startAt: number): void {
  const oscillator = ctx.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(GAIN, startAt + FADE_SECONDS);
  gain.gain.setValueAtTime(GAIN, startAt + durationSeconds - FADE_SECONDS);
  gain.gain.linearRampToValueAtTime(0, startAt + durationSeconds);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + durationSeconds);
}

/**
 * Plays `frequencies` back to back with a short gap between each tone, and
 * resolves once the last tone has finished.
 */
export function playSequence(
  ctx: AudioContext,
  frequencies: number[],
  toneSeconds = 0.45,
  gapSeconds = 0.2
): Promise<void> {
  const leadInSeconds = 0.05;
  const startBase = ctx.currentTime + leadInSeconds;
  frequencies.forEach((freq, i) => {
    scheduleTone(ctx, freq, toneSeconds, startBase + i * (toneSeconds + gapSeconds));
  });
  const totalSeconds = leadInSeconds + frequencies.length * (toneSeconds + gapSeconds) - gapSeconds;
  return new Promise((resolve) => setTimeout(resolve, totalSeconds * 1000));
}
