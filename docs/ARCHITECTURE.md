# Architecture

## Why a static PWA instead of ASP.NET Core MVC

| Requirement | Consequence |
|---|---|
| Section 14-B: every calculator must work with no internet | Calculations must run on the student's device, not on a server |
| Section 14-G: students must not install .NET or developer tools; deployable to static HTTPS hosting | No server runtime can be required |
| Section 3: C# / ASP.NET Core MVC | Conflicts with the two rows above |

Options considered: (1) Blazor WebAssembly PWA (C# in the browser), chosen by the project owner first; (2) MVC server plus a duplicate JS engine; (3) static PWA with a JavaScript engine. The build environment could not reach NuGet (blocked by network policy, HTTP 403), so Blazor could not be compiled or tested there. Option 3 was then chosen. If C# is mandatory for grading, raise this with the instructor; the engine is small, pure and fully specified by its tests (`tests/cases.mjs`), so it can be ported to C# with the same test table.

## Mapping to the brief's MVC layers

| Brief | CHEMATRIX |
|---|---|
| Models | `app/js/engine/solution.js` (Solution model), `elements.js`, `ions.js`, `thermo-data.js`, `library.js` (reference data) |
| Services | `app/js/engine/*.js` calculation services: `formula`, `equation`, `classifier`, `predictor`, `stoich`, `gas`, `thermo`, `units`, `numbers`, `expr`, `practice` |
| Controllers | `app/js/app.js` (router) and the tool definitions `app/js/ui/tools-*.js` (map form input to a service call) |
| ViewModels | the declarative field specs in `tools-*.js` and the structured `Solution` object |
| Views | `app/js/ui/pages/*.js`, `solution-view.js`, `tool.js`, `index.html`, `css/app.css` |
| Data | `app/js/ui/store.js` (IndexedDB, with localStorage and memory fallbacks) |
| wwwroot | `app/` (static assets: `vendor/`, `fonts/`, `icons/`) |
| Tests | `tests/` (engine) and `tests/browser/` (end-to-end) |

The engine never touches the DOM and has no knowledge of the UI; it runs unchanged in Node for testing.

## Calculation engine principles

- **Deterministic.** No AI model or external service produces numbers.
- **Exact where possible.** Balancing and Hess's-law factors use exact rational arithmetic (BigInt fractions), so coefficients are never approximate.
- **No premature rounding.** Full double precision is kept; only the displayed final answer is rounded (sig-fig rule or the user's fixed setting). Intermediate steps are shown to 6 significant figures.
- **Units first.** All inputs are converted to one consistent unit system before substitution. Temperatures always become kelvin before any gas-law use. R is chosen to match the user's pressure and volume units.
- **Validate and explain.** Invalid or unphysical input raises a `ChemError` with a plain-language message; the predictor returns "needs more information" instead of inventing products.
- **One solution format.** Every solver returns a `Solution` with given, unknown, formula, rearranged formula, definitions, conversions, substitution, steps, answers, interpretation, assumptions and warnings.

## Offline design

- **App shell + precache.** `sw.js` precaches every file (53) under a cache named from the app version plus a content hash. Navigations are served the cached `index.html`; other requests are cache-first, so no network request is made while offline.
- **Safe updates.** `cache.addAll` is atomic; an interrupted download leaves the old version in control. A new version waits until the user taps "Reload", and old caches are deleted on activation.
- **Local data.** IndexedDB stores history (latest 300), practice progress and settings; it falls back to localStorage, then memory, with a visible notice. `navigator.storage.persist()` is requested to reduce eviction.
- **No external origins.** Fonts, Chart.js and icons are served locally; the Content Security Policy only allows the app's own origin.

## Security

| Brief item | Implementation |
|---|---|
| Input validation | Every number goes through `parseMeasured` (strict pattern, length limit, finiteness); formulas through a hand-written parser with a character whitelist, length and nesting limits |
| Safe formula parsing / no code execution | Recursive-descent parsers for formulas, equations and calculator expressions; no `eval`, `Function` or `innerHTML` of raw input (verified by tests) |
| SQL injection | No SQL database exists; IndexedDB stores structured objects |
| XSS / output encoding | DOM built with `textContent`; engine HTML is created only through `esc()`-based helpers; CSP `default-src 'self'` with no inline scripts |
| CSRF | Not applicable: no server, no cookies, no state-changing requests |
| Credentials / API keys | None exist |
| Access control | Not applicable: no accounts (by design) |
| Safe error handling | Expected errors show a plain message; unexpected errors show a generic message and are logged to the console only |
| Personal data | None collected; everything stays in the browser |
| Dependencies | Runtime: Chart.js 4 (bundled). Dev only: geist (fonts), puppeteer-core (tests) |
