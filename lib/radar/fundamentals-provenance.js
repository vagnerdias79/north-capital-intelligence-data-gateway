const DEFAULT_POLICY={
  schemaVersion:'NCI_FUNDAMENTALS_PROVENANCE_V1',
  maxRetrievalAgeHours:36,
  maxReportedPeriodAgeDays:200,
  trustedProviders:['Alpha Vantage'],
  requiredGroups:{
    quality:['profitMargin','operatingMargin','returnOnEquity'],
    growth:['revenueGrowthYoY','earningsGrowthYoY'],
    valuation:['forwardPE','peg','priceToSales'],
    upside:['analystTargetPrice']
  },
  minimumByGroup:{quality:2,growth:2,valuation:2,upside:1}
};

function timestamp(value){
  const time=Date.parse(value||'');
  return Number.isFinite(time)?time:null;
}
function finite(value){return value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))}
function age(now,time,unit){return time===null?null:Math.max(0,(now-time)/unit)}

export function evaluate(input={},options={}){
  const policy={...DEFAULT_POLICY,...options};
  const now=timestamp(options.now)||Date.now();
  const provider=String(input.provider||input.source||'').trim();
  const retrievedAt=timestamp(input.retrievedAt||input.providerRetrievedAt);
  const sourcePeriodEnd=timestamp(input.sourcePeriodEnd);
  const retrievalAgeHours=age(now,retrievedAt,3600000);
  const reportedPeriodAgeDays=age(now,sourcePeriodEnd,86400000);
  const providerTrusted=policy.trustedProviders.includes(provider);
  const groups={};
  const missing=[];
  for(const [group,fields] of Object.entries(policy.requiredGroups)){
    const present=fields.filter(field=>finite(input.data?.[field]));
    const required=policy.minimumByGroup[group]||fields.length;
    groups[group]={present:present.length,required,fields:present,complete:present.length>=required};
    if(present.length<required)missing.push(group);
  }
  const retrievalFresh=retrievalAgeHours!==null&&retrievalAgeHours<=policy.maxRetrievalAgeHours;
  const periodFresh=reportedPeriodAgeDays!==null&&reportedPeriodAgeDays<=policy.maxReportedPeriodAgeDays;
  let status='VERIFIED';
  if(!providerTrusted)status='UNTRUSTED_SOURCE';
  else if(retrievedAt===null||sourcePeriodEnd===null)status='UNKNOWN_DATE';
  else if(!retrievalFresh)status='STALE_RETRIEVAL';
  else if(!periodFresh)status='STALE_PERIOD';
  else if(missing.length)status='INCOMPLETE';
  const eligible=status==='VERIFIED';
  return {
    schemaVersion:policy.schemaVersion,status,eligible,provider,
    retrievedAt:retrievedAt===null?null:new Date(retrievedAt).toISOString(),
    sourcePeriodEnd:sourcePeriodEnd===null?null:new Date(sourcePeriodEnd).toISOString().slice(0,10),
    retrievalAgeHours,reportedPeriodAgeDays,providerTrusted,retrievalFresh,periodFresh,
    groups,missing,
    decisionAuthorization:false,writeOperationsEnabled:false
  };
}

export const policy=Object.freeze(DEFAULT_POLICY);
export default {evaluate,policy};
