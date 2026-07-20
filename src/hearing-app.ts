import { buildTrial, type Trial, type TrialKind } from "./hearing";
import { isConsistentWithChanceGuessing } from "./stats";
import { getAudioContext, playSequence } from "./tone";

interface SequenceItem {
  kind: TrialKind;
  trial: Trial;
}

interface TrialResult extends SequenceItem {
  answer: string; // "0" | "1" | "2" | "none"
  correct: boolean;
}

const PITCH_TRIALS = 8;
const CONTROL_TRIALS = 2;
const BLANK_TRIALS = 2;
const TIME_LIMIT_MS = 15_000; // starts once the tones finish playing

const DISCLAIMER =
  "This is a casual, for-fun screening toy — not a medical device or hearing test. It has not " +
  "been clinically validated, and results depend heavily on your speakers/headphones, volume, " +
  "and background noise — far more than a real hearing test would allow. If you're concerned " +
  "about your hearing, see an audiologist.";

const NOT_VALIDATED_LINE = "This is not medically validated — see an audiologist for accurate results.";

function correctAnswerFor(trial: Trial): string {
  return trial.oddIndex === null ? "none" : String(trial.oddIndex);
}

function buildSequence(): SequenceItem[] {
  const seq: SequenceItem[] = [];
  for (let i = 0; i < PITCH_TRIALS; i++) seq.push({ kind: "pitch", trial: buildTrial("pitch") });
  for (let i = 0; i < CONTROL_TRIALS; i++) seq.push({ kind: "control", trial: buildTrial("control") });
  for (let i = 0; i < BLANK_TRIALS; i++) seq.push({ kind: "blank", trial: buildTrial("blank") });
  // shuffle
  for (let i = seq.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [seq[i], seq[j]] = [seq[j], seq[i]];
  }
  return seq;
}

export function mount(root: HTMLElement): void {
  let sequence = buildSequence();
  let current = 0;
  const results: TrialResult[] = [];

  function renderIntro() {
    root.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "screen";
    wrap.innerHTML = `
      <a class="back-link" href="index.html">← All tests</a>
      <h1>Pitch Discrimination Test</h1>
      <p class="disclaimer">${DISCLAIMER}</p>
      <p>Headphones are recommended — stereo speakers and ambient noise make this much harder
      than it should be. On iPhone, make sure the physical silent-mode switch is off, since it
      can silently mute browser audio.</p>
      <p>Each trial plays three tones. Two are the same pitch, one is different. Tell us which one
      — 1st, 2nd, or 3rd — or "Can't tell" if they all sound the same. A few trials use an obvious
      pitch difference and a few use no difference at all, as a sanity check. You'll have
      ${TIME_LIMIT_MS / 1000} seconds to answer once the tones finish playing; running out counts
      as "Can't tell" too. Nothing you enter is stored or sent anywhere — everything runs in your
      browser.</p>
      <button id="start" class="primary">Start</button>
    `;
    root.appendChild(wrap);
    wrap.querySelector<HTMLButtonElement>("#start")!.onclick = () => {
      getAudioContext(); // unlock audio playback during this user gesture
      current = 0;
      results.length = 0;
      renderTrialScreen();
    };
  }

  function renderTrialScreen() {
    root.innerHTML = "";
    const item = sequence[current];
    let answered = false;
    let timeoutId: number | undefined;

    const wrap = document.createElement("div");
    wrap.className = "screen";

    const progress = document.createElement("p");
    progress.className = "progress";
    progress.textContent = `Trial ${current + 1} of ${sequence.length}`;
    wrap.appendChild(progress);

    const timerBar = document.createElement("div");
    timerBar.className = "timer-bar";
    const timerFill = document.createElement("div");
    timerFill.className = "timer-fill";
    timerBar.appendChild(timerFill);
    wrap.appendChild(timerBar);

    const status = document.createElement("p");
    wrap.appendChild(status);

    const replay = document.createElement("button");
    replay.className = "secondary";
    replay.textContent = "▶ Replay";
    wrap.appendChild(replay);

    const prompt = document.createElement("p");
    prompt.textContent = "Which tone was different?";
    wrap.appendChild(prompt);

    const options = document.createElement("div");
    options.className = "options";
    const optionButtons: HTMLButtonElement[] = [];
    ["1st", "2nd", "3rd"].forEach((label, i) => {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.onclick = () => submitAnswer(String(i));
      options.appendChild(btn);
      optionButtons.push(btn);
    });
    wrap.appendChild(options);

    const skip = document.createElement("button");
    skip.className = "secondary";
    skip.textContent = "Can't tell";
    skip.onclick = () => submitAnswer("none");
    wrap.appendChild(skip);

    root.appendChild(wrap);

    function setInteractive(enabled: boolean) {
      replay.disabled = !enabled;
      skip.disabled = !enabled;
      optionButtons.forEach((b) => (b.disabled = !enabled));
    }

    function resetTimerBar() {
      timerFill.style.transitionDuration = "0s";
      timerFill.style.width = "100%";
    }

    function startTimer() {
      // Next frame, so the full-width reset above paints before the shrink
      // transition starts.
      requestAnimationFrame(() => {
        timerFill.style.transitionDuration = `${TIME_LIMIT_MS}ms`;
        timerFill.style.width = "0%";
      });
      timeoutId = window.setTimeout(() => submitAnswer("none"), TIME_LIMIT_MS);
    }

    function play() {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      resetTimerBar();
      status.textContent = "🔊 Playing…";
      setInteractive(false);
      const ctx = getAudioContext();
      void playSequence(ctx, item.trial.frequencies).then(() => {
        status.textContent = "What did you hear?";
        setInteractive(true);
        startTimer();
      });
    }

    replay.onclick = () => play();

    function submitAnswer(answerValue: string) {
      if (answered) return;
      answered = true;
      clearTimeout(timeoutId);
      answer(answerValue);
    }

    setInteractive(false);
    play();
  }

  function answer(answerValue: string) {
    const item = sequence[current];
    results.push({
      kind: item.kind,
      trial: item.trial,
      answer: answerValue,
      correct: answerValue === correctAnswerFor(item.trial),
    });
    current++;
    if (current >= sequence.length) {
      renderResults();
    } else {
      renderTrialScreen();
    }
  }

  function renderResults() {
    root.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "screen";

    const pitchResults = results.filter((r) => r.kind === "pitch");
    const pitchCorrect = pitchResults.filter((r) => r.correct).length;
    const pitchTotal = pitchResults.length;

    const controlResults = results.filter((r) => r.kind === "control");
    const controlCorrect = controlResults.filter((r) => r.correct).length;
    const controlTotal = controlResults.length;

    const blankResults = results.filter((r) => r.kind === "blank");
    const blankCorrect = blankResults.filter((r) => r.correct).length;
    const blankTotal = blankResults.length;

    const sanityMissed = controlTotal - controlCorrect + (blankTotal - blankCorrect);
    const sanityTotal = controlTotal + blankTotal;

    const reliabilityWarning =
      sanityMissed === 0
        ? ""
        : `<p class="warning"><strong>Missed ${sanityMissed} of ${sanityTotal} sanity-check
           trial${sanityMissed > 1 ? "s" : ""}</strong> (control trials with an obvious pitch
           difference, and blank trials with no difference at all). That usually means answers
           were rushed, guessed, or the audio setup made this harder than it should be, so treat
           the results below as unreliable.</p>`;

    const interpretation = isConsistentWithChanceGuessing(pitchCorrect, pitchTotal)
      ? "Your pitch discrimination score was statistically no better than random guessing on this quick test."
      : "You scored well above what random guessing would produce — no sign of a pitch discrimination difficulty in this quick test.";

    wrap.innerHTML = `
      <a class="back-link" href="index.html">← All tests</a>
      <h1>Results</h1>
      <p class="disclaimer">${DISCLAIMER}</p>
      ${reliabilityWarning}
      <ul class="results">
        <li><strong>Control trials</strong>: ${controlCorrect} / ${controlTotal} identified correctly</li>
        <li><strong>Blank trials</strong>: ${blankCorrect} / ${blankTotal} correctly identified as "Can't tell"</li>
        <li><strong>Pitch discrimination</strong>: ${pitchCorrect} / ${pitchTotal} identified correctly</li>
      </ul>
      <p>${interpretation}</p>
      <p class="disclaimer"><strong>${NOT_VALIDATED_LINE}</strong></p>
      <button id="restart" class="primary">Try again</button>
    `;
    root.appendChild(wrap);
    wrap.querySelector<HTMLButtonElement>("#restart")!.onclick = () => {
      sequence = buildSequence();
      renderIntro();
    };
  }

  renderIntro();
}
