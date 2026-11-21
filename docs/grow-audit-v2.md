# Grow audit v2

New audits use a focused nine-page French report with the same web/PDF data model. Existing historical reports keep their legacy rendering. No LLM generation is required; Gemini configuration remains available for legacy functionality. SerpKite AI visibility endpoints are optional and distinct from Gemini text generation.

## Configure

Set SERPKITE_API_KEY in Vercel Preview (or .env.local). Existing Google Places and PageSpeed keys are preserved. GROW_COUNTRY defaults to ca, GROW_GRID_SIZE defaults to 5 (set 3 for cheaper tests), GROW_MAX_SERPKITE_CREDITS defaults to 45 reserved credits per audit, and GROW_AI_VISIBILITY=off disables the three AI tests. Set an account-level spending cap and use authorized data for reports. The local credit reservation uses conservative costs, not a provider-side monthly quota. No new SQL migration is required; result.grow lives in existing JSON.

Enter the exact business name, city and target keyword. An ambiguous match is left unverified. A linked site is not proof of ownership; absent/unknown provider fields are not interpreted as confirmed missing. The GeoGrid is a schematic, not a licensed basemap. Review analytics are explicitly sample-based; direct history, posts and verification are not claimed. AI visibility is a point-in-time observation.

## Test

npm run type-check; npm test; npm run build. Configure the API key and run a known consenting business through /audits/new, check the result, then download the PDF. Test both with and without SerpKite. Verify the PDF is nine pages and that failed requests become unknown rather than zero. For commercial use, verify provider data reuse terms and Vercel plan eligibility.
