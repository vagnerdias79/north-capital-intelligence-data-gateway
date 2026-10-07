# EODHD preparation — private, read-only

This change prepares an isolated provider adapter. It does not replace Alpha Vantage, modify the dashboard, trust EODHD for Radar scoring, or change positions, transactions or tax records.

## Reviewed inputs

MSFT, NVDA and BRK-B JSON supplied by EODHD support were checked locally: all nine planned metrics, separate reporting/trading currencies, dates and missing-value handling. Original samples are deliberately not committed or exposed as public assets. INTR sample remains pending; null PEG behavior is covered by a synthetic test, not claimed as validation of actual INTR data.

The original `/api/fundamentals/{symbol}` endpoint matches these samples. Provider documentation recommends v1.1 for new integrations; upgrading is deferred until the v1.1 response is compared with the current mapping.

Sources: https://eodhd.com/financial-apis/stock-etfs-fundamental-data-feeds and support correspondence dated 2026-10-07.

## Endpoint

GET `/api/v2/eodhd-fundamentals?symbol=MSFT`, with the existing Neon Bearer JWT. One approved NCI equity per request. BRK.B maps to BRK-B.US. ETFs are not supported by this equity adapter.

All replies use `Cache-Control: private, no-store`. Identity verification precedes provider access. The verified subject must exactly match `EODHD_OWNER_SUBJECT`; authenticated users other than the owner are denied. Missing owner configuration fails closed. No raw errors or credential-bearing provider URLs are returned. Request timeout: 15 seconds; redirects forbidden.

Required server-only settings, after licensing and approval:
- `EODHD_OWNER_SUBJECT`: verified Neon subject of the license holder.
- `EODHD_API_KEY`: provider credential. Never place it in browser code, fixtures or chat.
- `EODHD_PREVIEW_ENABLED=true`: explicit activation, initially preview only. Disabled unless exact value is true.

No environment variables are provisioned by this PR, and no paid calls are made during local tests. Test the authenticated route in a protected preview before adding it to the dashboard refresh cycle. Owner-only authorization must also cover any future cached data. Current public Alpha Vantage endpoint must not serve EODHD data.

## Data contract

Ratios retain native decimal units; the UI can multiply by 100 for percentages. Numeric strings convert to numbers; null, empty strings, booleans and invalid numbers remain null. Nonpositive valuation ratios/target prices remain unavailable. Missing metrics are listed explicitly.

Latest reporting period is selected from released income-statement records with valid period/filing dates and revenue/net income; future or unpublished records are excluded. Retrieval date, provider update date, fiscal period, filing date and earnings report date are separate. No ADR ratio is fabricated. Forward PE, PEG and analyst target are identified as estimate-based fields.

Normalization is not independent accounting verification. Samples remain SAMPLE_ONLY and are not admitted to the existing provenance gate. Decision authorization and write operations remain false. The holdings allocation policy is unchanged; a 30% exit target discussed for the current INTR operation is not a general policy rule.

## Validation

131 tests passed: existing 121 plus 10 adapter/access tests. Three actual supplied samples were exercised locally without publication. Live subscription access, INTR payload, v1.1 compatibility and end-to-end dashboard integration remain to be validated before activation.
