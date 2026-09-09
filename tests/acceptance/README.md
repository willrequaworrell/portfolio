# Hero acceptance coverage

`npm test` creates a fresh production build, starts that build on port 3000, and
runs the semantic, capability-fallback, responsive-crop, font, and visual checks
in Playwright's Chromium, Firefox, and WebKit engines.

Before release, manually repeat the four responsive crop checks in the current
and previous stable Chrome, Edge, Firefox, and Safari releases, plus iOS Safari
17+ and current Android Chrome. Playwright's engines provide fast regression
coverage, but they are not substitutes for those vendor and device builds.
