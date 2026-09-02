# North Capital Intelligence — USD Platform

Deployable Vercel bundle.

## Data gateway
- `/api/quotes?symbols=VOO,QQQ,MSFT` — Yahoo Finance primary, Stooq fallback.
- `/api/fundamentals?symbols=LLY,ANET,VRT` — Alpha Vantage when `ALPHA_VANTAGE_API_KEY` is configured server-side.
- `/api/health`

## Security
Do not place API keys in `index.html`. Configure `ALPHA_VANTAGE_API_KEY` as a Vercel environment variable.

## Local
The HTML still preserves the last audited snapshot if external feeds fail.
