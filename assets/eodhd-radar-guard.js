import { evaluate } from '../lib/radar/fundamentals-provenance.js';
// Shadow assessment only. Never changes the production provider trust list.
export function assessRadarCandidate(row, {now=new Date().toISOString()}={}) {
  const provenance=row?.provenance||{};
  const assessment=evaluate({provider:row?.source,retrievedAt:provenance.retrievedAt,
    sourcePeriodEnd:provenance.sourcePeriodEnd,data:row?.data},{now});
  const reasons=[];
  if(row?.validation?.mode==='SAMPLE_ONLY'||provenance.sampleOnly)reasons.push('SAMPLE_ONLY');
  if(!assessment.providerTrusted)reasons.push('PROVIDER_NOT_ADMITTED');
  if(!assessment.retrievalFresh)reasons.push('RETRIEVAL_DATE_NOT_CURRENT');
  if(!assessment.periodFresh)reasons.push('REPORTING_PERIOD_NOT_CURRENT');
  if(assessment.missing.length)reasons.push('INCOMPLETE_REQUIRED_GROUPS');
  if(provenance.retrievedAt&&Date.parse(provenance.retrievedAt)>Date.parse(now))reasons.push('FUTURE_RETRIEVAL_DATE');
  for(const issue of row?.dataHealth?.issues||[])if(issue!=='MISSING_METRICS')reasons.push(issue);
  // Full-field absence is distinct from minimum group sufficiency (e.g. INTR PEG).
  return {mode:'SHADOW_VALIDATION',status:'BLOCKED',eligible:false,decisionAuthorization:false,
    reasons:[...new Set(reasons)],missingMetrics:row?.validation?.missingMetrics||[],
    groupAssessment:assessment.groups,productionGateStatus:assessment.status,
    writeOperationsEnabled:false};
}
