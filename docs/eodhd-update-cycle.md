# Integrated candidate update cycle

The dashboard refresh button now runs the authenticated receiver, identity validation, candidate planner, Radar calculation and preservation through runAuthenticatedUpdateCycle. It returns copies and outcome counts only; operationalApplied always remains zero. EODHD is still rejected by the unchanged production provenance gate. No license, activation, storage or operational publishing is added.

The local synthetic dialog runs the same candidate receiver and calculation/preservation stages for four ordered replies: sufficient, incomplete, stale and failed. Only TEST_FIXTURE can use the synthetic planner. Partial refresh preserves the last successful copy. Calculation exceptions also preserve the previous candidate. The original asset is never mutated.

Previous data freshness is reevaluated separately; preservation does not make stale data current or count synthetic results as operationally verified. Provider keys, issuer data coverage and commercial readiness remain outside this preparation.

163 tests pass, including the integrated authenticated disabled-provider stop, an EODHD response blocked by the operational gate, partial preservation, calculation failure, immutable source and stale previous data. Visual review pending. Production remains PR37 until explicit approval.
