# Color Vision Noise Test

A casual, client-side color vision screening toy. No backend, no persistence,
nothing leaves your browser.

**Not medically validated — see an optician for accurate results.**

## How it works

Each plate hides a digit inside a field of colored noise. "Confusion" plates
encode the digit purely via a figure/ground color pair that differs only
along the LMS cone axis a given deficiency (protan/deutan/tritan) can't
sense — invisible to that deficiency, visible to typical trichromats.
"Control" plates use a plain brightness contrast instead and should be
legible to everyone; missing one flags the results as unreliable.

Scoring compares each axis against a chance baseline (a binomial test
against random-digit guessing) rather than comparing axes to each other, so
answering randomly doesn't produce a false "pass."

## Development

```sh
npm install
npm run dev      # local dev server
npm run build    # type-check + production build to dist/
```

Deploys to GitHub Pages automatically on push to `main` via
`.github/workflows/deploy.yml`.
