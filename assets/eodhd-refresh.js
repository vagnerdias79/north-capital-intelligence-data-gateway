import {symbolFor} from './eodhd-normalize.js';
const stopping=new Set(['INTEGRATION_DISABLED','PROVIDER_NOT_CONFIGURED','OWNER_NOT_CONFIGURED','OWNER_ONLY','PROVIDER_ACCESS_DENIED','PROVIDER_RATE_LIMIT','PROVIDER_TIMEOUT','NCI_AUTH_REQUIRED','NCI_AUTH_INVALID']);
export async function prepareAuthenticatedRefresh({getToken,symbols=['MSFT'],fetchImpl=fetch}) {
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
      result.received++;
      for(const field of row.validation.missingMetrics||[])result.missingMetrics.push({ticker,field});
      result.status='RECEIVED_NOT_APPLIED';
    }catch(error){result.status=['TimeoutError','AbortError'].includes(error?.name)?'PROVIDER_TIMEOUT':'PROVIDER_UNAVAILABLE';result.errors.push({ticker,code:result.status});break;}
  }
  return result;
}
export function mountRefreshPreparation(bar,getToken) {
  if(document.getElementById('nciEodhdRefresh'))return;
  const button=document.createElement('button');button.type='button';button.id='nciEodhdRefresh';button.className='pill';
  button.textContent='EODHD · testar atualização';button.title='Verifica o fluxo autenticado para MSFT. Nenhum dado é aplicado.';
  const details=document.createElement('span');details.setAttribute('role','status');details.style.fontSize='11px';
  button.addEventListener('click',async()=>{
    button.disabled=true;details.textContent='Verificando fluxo autenticado...';
    try {
      const result=await prepareAuthenticatedRefresh({getToken});
      window.NCI_EODHD_REFRESH_PREPARATION=Object.freeze(result);
      const labels={INTEGRATION_DISABLED:'Provedor desativado — nenhuma atualização aplicada.',PROVIDER_NOT_CONFIGURED:'Chave não configurada — nenhuma atualização aplicada.',LOGIN_REQUIRED:'Entre com Google para testar.',OWNER_NOT_CONFIGURED:'Titular não configurado neste ambiente.',OWNER_ONLY:'Acesso restrito ao titular.',RECEIVED_NOT_APPLIED:'Resposta recebida em preparação — dados não aplicados.'};
      details.textContent=(labels[result.status]||`Atualização interrompida: ${result.status}.`)+` Requisições à NCI: ${result.requested} · Aplicados: 0.`;
    }catch{details.textContent='Falha na preparação. Nenhum dado aplicado.';}
    finally{button.disabled=false;}
  });
  bar.append(button,details);
}
