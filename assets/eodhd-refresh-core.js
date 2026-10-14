import {symbolFor} from './eodhd-normalize.js';
const stopping=new Set(['INTEGRATION_DISABLED','PROVIDER_NOT_CONFIGURED','OWNER_NOT_CONFIGURED','OWNER_ONLY','PROVIDER_ACCESS_DENIED','PROVIDER_RATE_LIMIT','PROVIDER_TIMEOUT','NCI_AUTH_REQUIRED','NCI_AUTH_INVALID']);
export async function prepareAuthenticatedRefresh({getToken,symbols=['MSFT'],fetchImpl=fetch,onRow=()=>{}}) {
  const result={mode:'READ_ONLY_REFRESH_PREPARATION',status:'PENDING',requested:0,received:0,errors:[],missingMetrics:[],
    applied:0,decisionAuthorization:false,writeOperationsEnabled:false};
  if(!Array.isArray(symbols)||!symbols.length||symbols.length>26)throw new Error('Invalid equity batch');
  const canonical=[...new Set(symbols.map(ticker=>symbolFor(ticker).slice(0,-3).replace('BRK-B','BRK.B')))];
  const token=await getToken();
  if(!token)return {...result,status:'LOGIN_REQUIRED'};
  for(const ticker of canonical) {
    result.requested++;
    try {
      const response=await fetchImpl('/api/fundamentals?provider=eodhd&symbol='+encodeURIComponent(ticker),{
        headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:AbortSignal.timeout(20000)});
      const payload=await response.json();
      const failure=payload?.error||payload?.status;
      if(!response.ok||payload?.ok!==true) {
        const code=stopping.has(failure)?failure:'PROVIDER_UNAVAILABLE';
        result.errors.push({ticker,code});result.status=code;
        // Stop all failures until safe provider retry semantics are reviewed.
        break;
      }
      const rows=payload.fundamentals;
      const row=Array.isArray(rows)&&rows.length===1?rows[0]:null;
      if(payload.mode!=='READ_ONLY_PREPARATION'||row?.ticker!==ticker||row?.source!=='EODHD'||row?.validation?.mode!=='PROVIDER_PAYLOAD'||row?.provenance?.sampleOnly!==false||row?.radarGate?.eligible!==false)
        {result.errors.push({ticker,code:'INVALID_RESPONSE'});result.status='INVALID_RESPONSE';break;}
      await onRow(row);
      result.received++;
      for(const field of row.validation.missingMetrics||[])result.missingMetrics.push({ticker,field});
      result.status='RECEIVED_NOT_APPLIED';
    }catch(error){result.status=['TimeoutError','AbortError'].includes(error?.name)?'PROVIDER_TIMEOUT':'PROVIDER_UNAVAILABLE';result.errors.push({ticker,code:result.status});break;}
  }
  return result;
}
