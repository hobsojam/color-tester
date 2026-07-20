# Perception Test Toys

Casual, client-side perception screening toys. No backend, no persistence,
nothing leaves your browser.

**Not medically validated — see a professional for accurate results.**

The landing page (`index.html`) links to each test:

## Color Vision Noise Test (`color.html`)

Each plate hides a digit inside a field of colored noise. "Confusion" plates
encode the digit purely via a figure/ground color pair that differs only
along the LMS cone axis a given deficiency (protan/deutan/tritan) can't
sense — invisible to that deficiency, visible to typical trichromats.
"Control" plates use a plain brightness contrast instead and "blank" plates
hide nothing at all; missing either flags the results as unreliable.

Scoring compares each axis against a chance baseline (a binomial test
against random-digit guessing) rather than comparing axes to each other, so
answering randomly doesn't produce a false "pass."

## Pitch Discrimination Test (`hearing.html`)

Each trial plays three tones via the Web Audio API — two at the same
frequency, one shifted up or down — and asks which one was different.
Frequencies are chosen log-uniformly across ~500–3000 Hz per trial so no
single pitch can be memorized. "Control" trials use an obvious pitch
difference and "blank" trials use no difference at all, mirroring the color
test's sanity checks; scoring uses the same chance-baseline approach.

Unlike the color test, audio playback depends heavily on uncontrollable
factors (speaker/headphone frequency response, volume, background noise),
so this is even further from anything diagnostic — headphones are
recommended, and it's disclaimed accordingly in the UI.

## Development

```sh
npm install
npm run dev      # local dev server
npm run build    # type-check + production build to dist/
```

Multi-page build (`vite.config.ts` `build.rollupOptions.input`) emits
`index.html`, `color.html`, and `hearing.html` as separate entries. Deploys
to GitHub Pages automatically on push to `main` via
`.github/workflows/deploy.yml`.
