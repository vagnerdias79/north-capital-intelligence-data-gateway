# Isolated Radar application rehearsal

Synthetic fixtures only. The dashboard reuses the existing NCI_BUY_SCORE.calculate function on cloned inputs and displays results in a separate dialog marked SIMULATION_ONLY. No operational state, storage or production provider trust is modified. A fixture-local evaluator allows TEST_FIXTURE only; real tickers and EODHD samples are rejected by this rehearsal. Owner JWT must pass the existing zero-provider auth diagnostic before display.

Scenarios: sufficient fields, insufficient valuation group, stale accounting period. The latter two produce null scores with PENDING_DATA using the same engine. Successful fictional calculations remain operationalScore=null, operationalEligible=false and decisionAuthorization=false. These results do not establish EODHD data coverage, investment suitability or current prices.

155 tests passed, including direct use of the current engine extracted from index.html, nonmutation, data/date blocking and sample rejection. User visual review pending. Paid-provider activation and commercial licensing remain deferred.
