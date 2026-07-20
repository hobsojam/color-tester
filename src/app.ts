import { type Deficiency } from "./color";
import { randomDigit, renderPlate, type PlateSpec } from "./plate";
import { isConsistentWithChanceGuessing } from "./stats";

type Axis = Deficiency | "control";

interface SequenceItem {
  axis: Axis;
  digit: string;
}

interface PlateResult extends SequenceItem {
  answer: string;
  correct: boolean;
}

const DEFICIENCIES: Deficiency[] = ["protan", "deutan", "tritan"];
const PLATES_PER_TYPE = 3;
const CONTROL_PLATES = 2;

const DISCLAIMER =
  "This is a casual, for-fun screening toy — not a medical device or diagnostic test. " +
  "It has not been clinically validated, and results depend heavily on your screen's color " +
  "calibration and lighting. If you're concerned about your color vision, see an eye care " +
  "professional.";

const NOT_VALIDATED_LINE =
  "This is not medically validated — see an optician for accurate results.";

function buildSequence(): SequenceItem[] {
  const seq: SequenceItem[] = [];
  for (const deficiency of DEFICIENCIES) {
    for (let i = 0; i < PLATES_PER_TYPE; i++) {
      seq.push({ axis: deficiency, digit: randomDigit() });
    }
  }
  for (let i = 0; i < CONTROL_PLATES; i++) {
    seq.push({ axis: "control", digit: randomDigit() });
  }
  // shuffle
  for (let i = seq.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [seq[i], seq[j]] = [seq[j], seq[i]];
  }
  return seq;
}

function specFor(item: SequenceItem): PlateSpec {
  return item.axis === "control"
    ? { kind: "control", digit: item.digit }
    : { kind: "confusion", deficiency: item.axis, digit: item.digit };
}

export function mount(root: HTMLElement): void {
  let sequence = buildSequence();
  let current = 0;
  const results: PlateResult[] = [];

  function renderIntro() {
    root.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "screen";
    wrap.innerHTML = `
      <h1>Color Vision Noise Test</h1>
      <p class="disclaimer">${DISCLAIMER}</p>
      <p>You'll see ${sequence.length} plates made of colored noise, each hiding a single digit.
      A few of them are control plates that should be readable by everyone regardless of color
      vision — they just check you're actually looking. Enter the digit you see, or "Can't tell"
      if nothing is legible. Nothing you enter is stored or sent anywhere — everything runs in
      your browser.</p>
      <button id="start" class="primary">Start</button>
    `;
    root.appendChild(wrap);
    wrap.querySelector<HTMLButtonElement>("#start")!.onclick = () => {
      current = 0;
      results.length = 0;
      renderPlateScreen();
    };
  }

  function renderPlateScreen() {
    root.innerHTML = "";
    const item = sequence[current];

    const wrap = document.createElement("div");
    wrap.className = "screen";

    const progress = document.createElement("p");
    progress.className = "progress";
    progress.textContent = `Plate ${current + 1} of ${sequence.length}`;
    wrap.appendChild(progress);

    const canvas = document.createElement("canvas");
    canvas.className = "plate";
    wrap.appendChild(canvas);
    renderPlate(canvas, specFor(item));

    const prompt = document.createElement("p");
    prompt.textContent = "What digit do you see?";
    wrap.appendChild(prompt);

    const pad = document.createElement("div");
    pad.className = "pad";
    for (let d = 0; d <= 9; d++) {
      const btn = document.createElement("button");
      btn.textContent = String(d);
      btn.onclick = () => answer(String(d));
      pad.appendChild(btn);
    }
    wrap.appendChild(pad);

    const skip = document.createElement("button");
    skip.className = "secondary";
    skip.textContent = "Can't tell";
    skip.onclick = () => answer("none");
    wrap.appendChild(skip);

    root.appendChild(wrap);
  }

  function answer(answerValue: string) {
    const item = sequence[current];
    results.push({
      axis: item.axis,
      digit: item.digit,
      answer: answerValue,
      correct: answerValue === item.digit,
    });
    current++;
    if (current >= sequence.length) {
      renderResults();
    } else {
      renderPlateScreen();
    }
  }

  function renderResults() {
    root.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "screen";

    const rows = DEFICIENCIES.map((deficiency) => {
      const forType = results.filter((r) => r.axis === deficiency);
      const correct = forType.filter((r) => r.correct).length;
      return { deficiency, correct, total: forType.length };
    });

    const controlResults = results.filter((r) => r.axis === "control");
    const controlCorrect = controlResults.filter((r) => r.correct).length;
    const controlTotal = controlResults.length;
    const controlPassed = controlCorrect === controlTotal;

    const reliabilityWarning = controlPassed
      ? ""
      : `<p class="warning"><strong>Missed ${controlTotal - controlCorrect} of ${controlTotal} control
         plate${controlTotal - controlCorrect > 1 ? "s" : ""}</strong> — these use plain brightness
         contrast and should be readable regardless of color vision. That usually means answers were
         rushed, guessed, or the screen was hard to see, so treat the results below as unreliable.</p>`;

    wrap.innerHTML = `
      <h1>Results</h1>
      <p class="disclaimer">${DISCLAIMER}</p>
      ${reliabilityWarning}
      <ul class="results">
        <li><strong>Control plates</strong>: ${controlCorrect} / ${controlTotal} read correctly</li>
        ${rows
          .map(
            (r) =>
              `<li><strong>${labelFor(r.deficiency)}</strong>: ${r.correct} / ${r.total} plates read correctly</li>`
          )
          .join("")}
      </ul>
      <p>${interpretResults(rows)}</p>
      <p class="disclaimer"><strong>${NOT_VALIDATED_LINE}</strong></p>
      <button id="restart" class="primary">Try again</button>
    `;
    root.appendChild(wrap);
    wrap.querySelector<HTMLButtonElement>("#restart")!.onclick = () => {
      sequence = buildSequence();
      renderIntro();
    };
  }

  function interpretResults(rows: { deficiency: Deficiency; correct: number; total: number }[]): string {
    const families = new Set<string>();
    for (const r of rows) {
      if (isConsistentWithChanceGuessing(r.correct, r.total)) {
        families.add(r.deficiency === "tritan" ? "blue-yellow" : "red-green");
      }
    }

    if (families.size === 0) {
      return "You scored well above what random guessing would produce on every axis — no sign of a color vision difference in this quick test.";
    }

    const list = [...families].join(" and ");
    return `Your score on the ${list} ${families.size > 1 ? "axes" : "axis"} was statistically no better
      than random guessing, which is consistent with a color vision deficiency there.`;
  }

  function labelFor(d: Deficiency): string {
    if (d === "protan") return "Red-green (protan axis)";
    if (d === "deutan") return "Red-green (deutan axis)";
    return "Blue-yellow (tritan axis)";
  }

  renderIntro();
}
