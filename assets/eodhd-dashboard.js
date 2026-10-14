import {mountRadarSimulation} from './eodhd-radar-simulation.js';
import {mountRefreshPreparation} from './eodhd-refresh.js';
export function diagnosticState(result, httpStatus=200) {
  if(httpStatus===401)return {status:'LOGIN_REQUIRED',label:'EODHD · entrar',message:'Sessão ausente ou expirada. Entre pela página de autenticação.'};
  if(httpStatus===403)return {status:'OWNER_ONLY',label:'EODHD · acesso restrito',message:'Esta sessão não corresponde ao titular configurado.'};
  if(httpStatus!==200||!result||result.mode!=='AUTH_TEST_NO_PROVIDER_CALL')return {status:'UNAVAILABLE',label:'EODHD · indisponível',message:'Não foi possível validar o acesso. Nenhum dado aplicado.'};
  if(result.validation==='PASS'&&result.ownerMatch===true&&result.authenticated===true&&result.providerCalls===0)
    return {status:'OWNER_AUTHENTICATED',label:'EODHD · acesso validado',message:'Sessão do titular validada. Este teste não consulta o provedor nem confirma cobertura ou assinatura.'};
  if(result.ownerConfigured===false&&result.authenticated===true)return {status:'OWNER_NOT_CONFIGURED',label:'EODHD · configuração pendente',message:'Configure o titular neste ambiente. O provedor continua sem ativação.'};
  return {status:'UNAVAILABLE',label:'EODHD · resposta inconsistente',message:'O diagnóstico não confirmou o acesso. Nenhum dado aplicado.'};
}
export async function checkDashboardAccess(getToken,fetchImpl=fetch) {
  const token=await getToken();
  if(!token)return diagnosticState(null,401);
  const response=await fetchImpl('/api/fundamentals?provider=eodhd&mode=auth-test',{
    headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:AbortSignal.timeout(15000)
  });
  return diagnosticState(await response.json(),response.status);
}
export function mountDashboardDiagnostic(getToken) {
  const bar=document.querySelector('.statusbar');
  if(!bar||document.getElementById('nciEodhdStatus'))return;
  const button=document.createElement('button');button.type='button';button.id='nciEodhdStatus';button.className='pill';
  button.textContent='EODHD · preparação';button.title='Clique para validar sua sessão; sem consulta ao provedor.';
  button.addEventListener('click',async()=>{
    button.disabled=true;button.textContent='EODHD · verificando acesso';
    try {
      const state=await checkDashboardAccess(getToken);
      button.textContent=state.label;button.title=state.message;
      window.NCI_EODHD_DIAGNOSTIC=Object.freeze({...state,mode:'AUTH_ONLY',providerDataLoaded:false,decisionAuthorization:false,writeOperationsEnabled:false});
      window.dispatchEvent(new CustomEvent('nci:eodhd-diagnostic',{detail:window.NCI_EODHD_DIAGNOSTIC}));
    }catch{button.textContent='EODHD · indisponível';button.title='Falha de acesso; nenhum dado aplicado.';
      window.NCI_EODHD_DIAGNOSTIC=Object.freeze({status:'UNAVAILABLE',mode:'AUTH_ONLY',providerDataLoaded:false,decisionAuthorization:false,writeOperationsEnabled:false});}
    finally{button.disabled=false;}
  });
  bar.append(button);
  mountRefreshPreparation(bar,getToken);
  mountRadarSimulation(bar,getToken);
}
