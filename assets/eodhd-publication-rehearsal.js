import {evaluate} from '../lib/radar/fundamentals-provenance.js';
// Rehearses the final publication boundary only in a caller-owned synthetic copy.
// No operational publisher, storage, provider admission or global state is exposed.
export function rehearsePublication({base,current,candidate,now=new Date().toISOString()}) {
  const assets=[base,current,candidate];
  if(assets.some(asset=>asset?.ticker!=='TEST_FIXTURE'))throw new Error('Synthetic assets required');
  const preserved=structuredClone(current);
  const result=(status,asset=preserved)=>({mode:'SIMULATION_ONLY',status,asset,
    simulatedPublished:status==='SIMULATED_PUBLISHED',operationalApplied:0,
    decisionAuthorization:false,writeOperationsEnabled:false});
  if(JSON.stringify(base)!==JSON.stringify(current))return result('BASE_CHANGED');
  const p=candidate.fundamentalsProvenance||{};
  if(p.provider!=='TEST_FIXTURE')return result('INVALID_PROVENANCE');
  const times=[now,p.retrievedAt,p.sourcePeriodEnd].map(Date.parse);
  if(times.some(value=>!Number.isFinite(value))||times[1]>times[0]||times[2]>times[0])return result('INVALID_DATE');
  const gate=evaluate({provider:p.provider,retrievedAt:p.retrievedAt,sourcePeriodEnd:p.sourcePeriodEnd,data:candidate.fundamentals},{now,trustedProviders:['TEST_FIXTURE']});
  if(!gate.eligible)return result(gate.status);
  if(!Number.isFinite(candidate.buyScore)||candidate.buyScore<0||candidate.buyScore>100||candidate.buyScoreStatus!=='VALID')return result('INVALID_SCORE');
  return result('SIMULATED_PUBLISHED',structuredClone(candidate));
}
