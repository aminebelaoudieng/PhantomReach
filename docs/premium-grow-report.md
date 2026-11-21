# Premium Grow client report

The PDF is 14 custom A4 portrait pages split into Diagnostic, Action plan, Our services; existing stored audits render without a new SerpKite request. The web dashboard still exposes the commercial inputs used by the PDF.

The cover index is an internal weighted indicator (local top-three positions 40%, review volume relative to the compared maximum 25%, website link on profile 20%, AI mentions 15%). Unknown components are excluded and an index is only shown with at least 60% of known weights. It is not a Google score. Revenue and lead examples use explicit illustrative assumptions, not an inference from geographic coverage.

New audits preserve recurring words in available review text and excerpts of AI responses; historic audits lack these fields unless previously recorded. The AI competitor table only includes already tracked competitors. No extra SerpKite calls are made. No authority/backlink data is invented. Website analysis relies on measured PageSpeed scores.

Map: the PDF requests a limited read-only extract of roads and place labels from OpenStreetMap Overpass, with attribution and a seven-day Next fetch cache. This public service is best effort; use GROW_OSM_MAP=off if rate limits or policy require it, or replace it with a contracted/self-hosted provider for large workloads. Fallback is visibly marked schematic. No new paid map key is required. Check provider terms for use of Google-derived search data in commercial reports.

Run npm run verify:grow-report to validate the two site variants and the 14 A4 page boxes. A real authenticated client report should be visually inspected before distribution.
