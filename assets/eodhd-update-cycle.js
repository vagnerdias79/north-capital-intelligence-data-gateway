import {prepareAuthenticatedRefresh} from './eodhd-refresh-core.js';
import {planFundamentalsApplication,rehearseApplication} from './eodhd-application.js';
import {evaluate} from '../lib/radar/fundamentals-provenance.js';
function candidateReceiver(assets,calculate,plan,now) {
  const candidates=structuredClone(assets),outcomes=[];
  return {candidates,outcomes,receive(row){
    const indexes=candidates.map((asset,index)=>asset.ticker===row.ticker?index:-1).filter(index=>index>=0);
    if(!indexes.length)throw new Error('Unrequested response');
    for(const index of indexes){
      const previous=candidates[index];
      const planned=plan(previous,row,{now});
      if(planned.applied) {
        // Compute on another copy. If calculation fails, preserve the last candidate.
        const copy=structuredClone(planned.asset);
        try {calculate(copy);candidates[index]=copy;outcomes.push({ticker:row.ticker,status:'CANDIDATE_READY'});}
        catch{outcomes.push({ticker:row.ticker,status:'CALCULATION_FAILED_PRESERVED'});}
      }else outcomes.push({ticker:row.ticker,status:planned.reason,preserved:true});
    }
  }};
}
function finish(receiver,refresh,now) {
  const ready=receiver.outcomes.filter(x=>x.status==='CANDIDATE_READY').length;
  const freshness=receiver.candidates.map(asset=>({ticker:asset.ticker,assessment:evaluate({
    provider:asset.fundamentalsProvenance?.provider,retrievedAt:asset.fundamentalsProvenance?.retrievedAt,
    sourcePeriodEnd:asset.fundamentalsProvenance?.sourcePeriodEnd,data:asset.fundamentals},{now})}));
  return {mode:'CANDIDATE_ONLY',refresh,candidates:receiver.candidates,outcomes:receiver.outcomes,
    prepared:ready,preserved:receiver.outcomes.length-ready,freshness,
    operationalApplied:0,decisionAuthorization:false,writeOperationsEnabled:false};
}
export async function runAuthenticatedUpdateCycle({assets,getToken,calculate,fetchImpl=fetch,now=new Date().toISOString()}) {
  if(!Array.isArray(assets)||!assets.length||typeof calculate!=='function')throw new Error('Invalid cycle inputs');
  const receiver=candidateReceiver(assets,calculate,planFundamentalsApplication,now);
  const refresh=await prepareAuthenticatedRefresh({getToken,symbols:assets.map(x=>x.ticker),fetchImpl,onRow:row=>receiver.receive(row)});
  return finish(receiver,refresh,now);
}
export function rehearseUpdateCycle({asset,responses,calculate,now=new Date().toISOString()}) {
  if(asset?.ticker!=='TEST_FIXTURE'||!Array.isArray(responses)||responses.some(row=>row?.ticker!=='TEST_FIXTURE'||row?.source!=='TEST_FIXTURE'))throw new Error('Only synthetic cycle allowed');
  const planner=(old,row,options)=>rehearseApplication(old,row,()=>{},options);
  const receiver=candidateReceiver([asset],calculate,planner,now);
  for(const row of responses)receiver.receive(structuredClone(row));
  return {...finish(receiver,{status:'SIMULATED',requested:responses.length},now),mode:'SIMULATION_ONLY',
    label:'CICLO FICTÍCIO — SEM CONSULTA AO PROVEDOR'};
}
