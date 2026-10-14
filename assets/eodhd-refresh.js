export {prepareAuthenticatedRefresh} from './eodhd-refresh-core.js';
import {runAuthenticatedUpdateCycle} from './eodhd-update-cycle.js';
export function mountRefreshPreparation(bar,getToken) {
  if(document.getElementById('nciEodhdRefresh'))return;
  const button=document.createElement('button');button.type='button';button.id='nciEodhdRefresh';button.className='pill';
  button.textContent='EODHD · testar atualização';button.title='Verifica o fluxo autenticado para MSFT. Nenhum dado é aplicado.';
  const details=document.createElement('span');details.setAttribute('role','status');details.style.fontSize='11px';
  button.addEventListener('click',async()=>{
    button.disabled=true;details.textContent='Verificando fluxo autenticado...';
    try {
      const previous=(window.PORT||window.RADAR||[]).find(asset=>asset.ticker==='MSFT')||{ticker:'MSFT'};
      const cycle=await runAuthenticatedUpdateCycle({assets:[previous],getToken,calculate:window.NCI_BUY_SCORE?.calculate||(()=>{throw new Error('Radar engine unavailable');})});
      const result={...cycle.refresh,prepared:cycle.prepared,preserved:cycle.preserved,operationalApplied:cycle.operationalApplied};
      window.NCI_EODHD_REFRESH_PREPARATION=Object.freeze(result);
      const labels={INTEGRATION_DISABLED:'Provedor desativado — nenhuma atualização aplicada.',PROVIDER_NOT_CONFIGURED:'Chave não configurada — nenhuma atualização aplicada.',LOGIN_REQUIRED:'Entre com Google para testar.',OWNER_NOT_CONFIGURED:'Titular não configurado neste ambiente.',OWNER_ONLY:'Acesso restrito ao titular.',RECEIVED_NOT_APPLIED:'Resposta recebida em preparação — dados não aplicados.'};
      details.textContent=(labels[result.status]||`Atualização interrompida: ${result.status}.`)+` Requisições à NCI: ${result.requested} · Aplicados: 0.`;
    }catch{details.textContent='Falha na preparação. Nenhum dado aplicado.';}
    finally{button.disabled=false;}
  });
  bar.append(button,details);
}
