import {evaluate} from '../lib/radar/fundamentals-provenance.js';
import {metricPaths} from './eodhd-normalize.js';
export function planFundamentalsApplication(asset,row,{now=new Date().toISOString()}={}) {
  const previous=structuredClone(asset);
  const blocked=reason=>({applied:false,reason,asset:previous,decisionAuthorization:false,writeOperationsEnabled:false});
  if(!asset?.ticker||row?.ticker!==asset.ticker||row?.ok!==true)return blocked('INVALID_IDENTITY_OR_RESPONSE');
  if(row?.validation?.mode==='SAMPLE_ONLY'||row?.provenance?.sampleOnly)return blocked('SAMPLE_ONLY');
  const p=row.provenance||{};
  if(!p.retrievedAt||Date.parse(p.retrievedAt)>Date.parse(now)||Date.parse(p.sourcePeriodEnd)>Date.parse(now))return blocked('INVALID_OR_FUTURE_DATE');
  const gate=evaluate({provider:row.source,retrievedAt:p.retrievedAt,sourcePeriodEnd:p.sourcePeriodEnd,data:row.data},{now});
  if(!gate.eligible)return blocked(gate.status);
  // Replace the metric set. A missing new metric cannot inherit an old value.
  const data=Object.fromEntries(Object.keys(metricPaths).map(field=>[field,row.data?.[field]??null]));
  const next={...previous,fundamentals:{...data,provider:row.source,providerRetrievedAt:p.retrievedAt,sourcePeriodEnd:p.sourcePeriodEnd},
    fundamentalsProvenance:{...p,...gate},dataStatus:'VERIFIED',lastDataSync:p.retrievedAt};
  return {applied:true,reason:'VERIFIED',asset:next,decisionAuthorization:false,writeOperationsEnabled:false};
}
// Test-local application rehearsal; real ticker/provider payloads cannot enter this path.
export function rehearseApplication(asset,row,calculate,{now=new Date().toISOString()}={}) {
  if(asset?.ticker!=='TEST_FIXTURE'||row?.ticker!=='TEST_FIXTURE'||row?.source!=='TEST_FIXTURE')throw new Error('Synthetic fixture required');
  const previous=structuredClone(asset);
  const p=row.provenance||{};
  const gate=evaluate({provider:row.source,...p,data:row.data},{now,trustedProviders:['TEST_FIXTURE']});
  if(row.ok!==true||!gate.eligible)return {applied:false,reason:row.ok===true?gate.status:'UPDATE_FAILED',asset:previous,mode:'SIMULATION_ONLY',operationalApplied:0};
  const next=structuredClone(previous);
  next.fundamentals=Object.fromEntries(Object.keys(metricPaths).map(field=>[field,row.data?.[field]??null]));
  next.fundamentalsProvenance=gate;calculate(next);
  return {applied:true,reason:'SIMULATED_APPLICATION',asset:next,mode:'SIMULATION_ONLY',operationalApplied:0};
}
