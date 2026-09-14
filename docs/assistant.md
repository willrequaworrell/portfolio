# Portfolio assistant

The assistant is enabled by default only outside Vercel. Set
`PORTFOLIO_ASSISTANT_ENABLED=true` for the dedicated assistant preview and
leave it unset or false for ordinary previews and production. The default model
is `openai/gpt-5.6-luna`; override it with `PORTFOLIO_ASSISTANT_MODEL_ID`.

Vercel AI Gateway uses the deployment's managed OIDC credentials. For local
Gateway testing, use `vercel dev` or refresh the linked environment with
`vercel env pull`. `AI_GATEWAY_API_KEY` is supported by the Gateway SDK as a
fallback when OIDC is unavailable. Never expose these values through a public
Next.js environment variable.

`npm run dev` and `npm run build` compile `portfolio-material/*.md` into the
ignored `.generated/portfolio-material.json` server artifact. Invalid content
fails compilation. The browser never reads source Markdown or the generated
artifact directly.

The deterministic `fake/portfolio-assistant` model ID is reserved for the test
suite. `npm test` verifies both a disabled build and the enabled streaming path.
