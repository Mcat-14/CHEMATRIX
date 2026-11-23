# CHEMATRIX

**Calculate. Understand. Explore.**

CHEMATRIX is a chemistry solver and learning app. It covers stoichiometry and reactions, states of matter and gas laws, and thermochemistry. Every answer shows the full working: given values, the formula, variable meanings, unit conversions, substitution, calculation, the final answer and an explanation.

It is an installable Progressive Web App (PWA). Students open a link, add it to the home screen, and from then on it works **without internet** on Android, iPhone, iPad, Windows, Mac and Chromebook. No account, no app store, no programming tools.

## For students and instructors (no installation of tools)

1. Open the CHEMATRIX link your teacher shared (it must be an `https://` address).
2. Install it: Android, use Chrome → "Install app". iPhone/iPad, use Safari → Share → "Add to Home Screen". Computer, use Chrome/Edge → install icon in the address bar.
3. Open it once while online. After that it works offline.

Step-by-step guides with screenshots-in-words: [docs/INSTALL.md](docs/INSTALL.md). How to use the calculators: [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

## For developers

Requirements: **Node.js 18 or newer** (only for testing and local serving; the app itself is plain HTML, CSS and JavaScript with no build step).

```bash
npm install            # dev tools only: Chart.js copy, fonts, Puppeteer for browser tests
npm test               # 114 engine tests (calculations, invalid input, security)
npm run serve          # rebuilds sw.js, then serves app/ at http://localhost:8080
npm run test:browser   # 13 offline / install / mobile scenarios in headless Chrome
npm run report         # regenerates docs/TEST_REPORT.md, FORMULA_REFERENCE.md, TOPIC_CHECKLIST.md
```

To publish, upload the `app/` folder to any static HTTPS host (GitHub Pages, Netlify, Cloudflare Pages). Run `npm run build` first after any change so the offline cache is versioned. Details: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## What is included

| Area | Features |
|---|---|
| Stoichiometry | Molar mass (brackets, hydrates, per-element contribution), mass ↔ moles ↔ particles, mole ratios, limiting reactant with excess and theoretical yield, percent yield |
| Reactions | Exact equation balancer (polyatomic ions, hydrates, ionic charges, checks typed coefficients), classifier for the five reaction types with reasons, product prediction (activity series, solubility rules, combustion) that asks instead of guessing |
| Gas laws | Boyle, Charles, Gay-Lussac, combined, Avogadro, ideal gas (solve P, V, n or T with R matched to units), gas density, molar mass of a gas, interactive graph explorer |
| States of matter | Particle simulation for solid/liquid/gas, comparison table, changes of state |
| Thermochemistry | q = mcΔT (any variable), final/initial temperature, specific heat, calorimetry (mixing, unknown metal, coffee cup, bomb), ΔH from formation data, molar ΔH, heat for an amount, Hess's law (manual or automatic factors), bond energies, interactive energy diagram |
| Tools | Formula library (27 formulas), unit converter, safe scientific calculator, practice mode (12 topics × 3 levels), history, PDF/print export, light/dark mode |

## Project structure

```
app/                     ← the whole deployable app (static files)
  index.html             app shell (header, navigation, bottom bar)
  manifest.webmanifest   PWA install data
  sw.template.js → sw.js offline service worker (sw.js is generated)
  css/app.css            design system
  js/engine/             chemistry engine: pure functions, no DOM (the "models + services")
  js/ui/                 views and controllers: tool forms, solution view, storage, charts
  js/ui/pages/           one module per page
  vendor/ fonts/ icons/  Chart.js, Geist fonts and app icons, all served locally
tests/                   engine tests, verification cases, browser tests
tools/                   build-sw, local server, icon renderer, report generator
docs/                    guides, references and test reports
```

## Important notes

- **Stack change from the original brief.** The brief asked for ASP.NET Core MVC with C#, and later required full offline use and installation without .NET. A server-side C# engine cannot calculate when the phone is offline. The project owner chose a Blazor WebAssembly PWA, but this build environment could not download .NET packages (NuGet was blocked by its network policy). The owner then chose a static PWA with a JavaScript engine. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the brief's MVC layering maps onto this design.
- **Check the topic list.** [docs/TOPIC_CHECKLIST.md](docs/TOPIC_CHECKLIST.md) marks topics that are not implemented (for example empirical formulas, Dalton's law, molarity) so they can be confirmed with the instructor.
- **Real-device testing.** The automated browser tests emulate phones in Chrome. Test on at least one real Android phone and one iPhone before presenting ([docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) has a checklist).

## Licences

App code: yours to use for the course. Chart.js: MIT (`app/vendor/chart.js-LICENSE.md`). Geist fonts: SIL Open Font License (`app/fonts/OFL.txt`).
