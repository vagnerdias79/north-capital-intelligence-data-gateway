# Final publication boundary rehearsal

PR38 introduced candidate preparation without an operational publisher. This increment rehearses the final boundary exclusively for TEST_FIXTURE in a caller-owned copy. It checks the current base against the captured base, checks provenance and dates again at publication time, reevaluates required groups and freshness, and rejects invalid scores. Every result retains operationalApplied=0 and decisionAuthorization=false. No provider admission, storage or global asset mutation is added.

The dashboard's authenticated isolated dialog shows three fictitious outcomes: SIMULATED_PUBLISHED, BASE_CHANGED and STALE_RETRIEVAL. Simulated publication means only a returned independent copy; nothing is published to the actual Radar.

Remaining before real use: licensed full-universe provider validation, explicit provider admission, an operational publication contract and concurrent update/version handling, storage and tenant isolation where required, plus end-to-end verification with admitted real data. Commercial licensing remains separate. The simple synthetic base comparison is not an operational concurrency mechanism.

Validation: 168 tests passed, including freshness expiring after preparation, base conflict, incomplete data, invalid scores, future dates, real identity rejection and input immutability. Visual validation in preview remains pending. Production is unchanged at PR38.
