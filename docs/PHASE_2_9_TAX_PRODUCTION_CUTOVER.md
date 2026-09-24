# Phase 2.9 — Controlled TAX production cutover

## Authorization

Manual production approval was recorded on 2026-09-24 after Phase 2.8 returned
`GO_AWAITING_MANUAL_APPROVAL`.

## Feature flag

`TAX_NORMALIZED_PRODUCTION_ENABLED=true` activates the normalized TAX source only
in the Vercel Production environment. The default and every other value keep the
legacy source active.

## Runtime guards

Every authenticated dashboard request revalidates the frozen `USD-INTL`
portfolio, baseline `NCI USD 1.1.02`, ledger fingerprint, 9 TAX events, the
normalized and legacy total of `-0.54`, zero difference, and zero divergences.

If any guard fails, the same request selects `LEGACY_METADATA_RAW_VALUE` and
reports `AUTOMATIC_ROLLBACK_TO_LEGACY`. No database write operation is enabled.

## Rollout order

1. Deploy the code with the production flag absent or disabled.
2. Verify the production dashboard remains on the legacy source.
3. Set the flag for Production only and redeploy.
4. Verify `phase: 2.9`, `decision: NORMALIZED_ACTIVE`, and `validation: PASS`.
5. On any divergence, confirm automatic legacy selection and disable the flag.
