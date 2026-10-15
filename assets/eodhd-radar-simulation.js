import {rehearsePublication} from './eodhd-publication-rehearsal.js';
import {rehearseUpdateCycle} from './eodhd-update-cycle.js';
import {rehearseApplication} from './eodhd-application.js';
import {evaluate} from '../lib/radar/fundamentals-provenance.js';
const fixtureData=Object.freeze({profitMargin:.2,operatingMargin:.3,returnOnEquity:.25,revenueGrowthYoY:.15,earningsGrowthYoY:.2,forwardPE:22,peg:1.3,priceToSales:5,analystTargetPrice:120,beta:1});
export function simulationCases(now=new Date().toISOString()) {
  const day=new Date(now).toISOString().slice(0,10);
  const period=new Date(Date.parse(now)-100*86400000).toISOString().slice(0,10);
  const base={ticker:'TEST_FIXTURE',price:100,fundamentals:{...fixtureData},provenance:{provider:'TEST_FIXTURE',retrievedAt:day,sourcePeriodEnd:period}};
  return [{label:'Dados suficientes — fictícios',asset:structuredClone(base)},
    {label:'Valuation insuficiente — fictício',asset:{...structuredClone(base),fundamentals:{...fixtureData,forwardPE:null,peg:null}}},
    {label:'Período antigo — fictício',asset:{...structuredClone(base),provenance:{...base.provenance,sourcePeriodEnd:'2020-01-01'}}}];
}
export function simulateRadarApplication(input,calculate,{now=new Date().toISOString()}={}) {
  if(input?.ticker!=='TEST_FIXTURE'||input?.provenance?.provider!=='TEST_FIXTURE')throw new Error('Only synthetic fixtures are allowed');
  const copy=structuredClone(input);
  // This override exists only in this isolated evaluator. The operational trust list is untouched.
  const gate=evaluate({...copy.provenance,data:copy.fundamentals},{now,trustedProviders:['TEST_FIXTURE']});
  copy.fundamentalsProvenance={...gate,eligible:gate.eligible};
  calculate(copy);
  return {mode:'SIMULATION_ONLY',label:'DADOS FICTÍCIOS — NÃO USAR PARA INVESTIR',
    simulationScore:copy.buyScore??null,simulationStatus:copy.buyScoreStatus,
    simulatedGateStatus:gate.status,missing:copy.buyScoreDetails?.missing||[],
    operationalScore:null,operationalEligible:false,decisionAuthorization:false,writeOperationsEnabled:false};
}
export function mountRadarSimulation(bar,getToken) {
  if(document.getElementById('nciRadarSimulation'))return;
  const button=document.createElement('button');button.id='nciRadarSimulation';button.type='button';button.className='pill';button.textContent='Radar · ensaio isolado';
  button.addEventListener('click',async()=>{
    button.disabled=true;
    try {
      const token=await getToken();if(!token)throw new Error('Entre com Google para executar o ensaio.');
      const response=await fetch('/api/fundamentals?provider=eodhd&mode=auth-test',{headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:AbortSignal.timeout(15000)});
      const access=await response.json();
      if(!response.ok||access.validation!=='PASS'||access.ownerMatch!==true)throw new Error('Acesso do titular não validado.');
      const calculate=window.NCI_BUY_SCORE?.calculate;
      if(typeof calculate!=='function')throw new Error('Motor do Radar indisponível.');
      document.getElementById('nciRadarSimulationDialog')?.remove();
      const dialog=document.createElement('dialog');dialog.id='nciRadarSimulationDialog';dialog.style.cssText='max-width:900px;width:90%;background:#0b1d2a;color:#e8eef5;border:1px solid #d6ad32;border-radius:12px;padding:24px';
      const add=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;dialog.append(node);return node;};
      add('h2','Radar — simulação isolada');
      add('p','DADOS FICTÍCIOS. Não são dados EODHD, preços atuais ou recomendações. O motor calcula somente cópias em memória. Scores da carteira e do Radar permanecem preservados.');
      const table=add('table','');table.style.width='100%';
      const head=document.createElement('tr');for(const title of ['Cenário','Controle dos dados','Score simulado','Score operacional']){const cell=document.createElement('th');cell.textContent=title;head.append(cell);}table.append(head);
      for(const item of simulationCases()) {
        const result=simulateRadarApplication(item.asset,calculate);
        const tr=document.createElement('tr');for(const value of [item.label,result.simulatedGateStatus,result.simulationScore===null?'Bloqueado':String(result.simulationScore),'Não aplicado']){const td=document.createElement('td');td.textContent=value;td.style.padding='12px';tr.append(td);}table.append(tr);
      }
      add('h3','Aplicação e preservação dos dados — teste fictício');
      const applicationTable=add('table','');applicationTable.style.width='100%';
      const appHead=document.createElement('tr');for(const text of ['Cenário','Resultado','Score na cópia','Aplicação operacional']){const th=document.createElement('th');th.textContent=text;appHead.append(th);}applicationTable.append(appHead);
      const cases=simulationCases();
      const previous={...structuredClone(cases[0].asset),buyScore:55};
      const makeRow=item=>({ticker:'TEST_FIXTURE',source:'TEST_FIXTURE',ok:true,data:item.asset.fundamentals,provenance:item.asset.provenance});
      const successful=rehearseApplication(previous,makeRow(cases[0]),calculate);
      const rehearsals=[{label:'Dados suficientes',result:successful},
        {label:'Dados incompletos: preservar anterior',result:rehearseApplication(previous,makeRow(cases[1]),calculate)},
        {label:'Período antigo: preservar anterior',result:rehearseApplication(previous,makeRow(cases[2]),calculate)},
        {label:'Falha após atualização: preservar resultado',result:rehearseApplication(successful.asset,{...makeRow(cases[0]),ok:false},calculate)}];
      for(const item of rehearsals){const tr=document.createElement('tr');for(const text of [item.label,item.result.applied?'Aplicado somente à cópia':`Preservado (${item.result.reason})`,String(item.result.asset.buyScore),'Nenhuma']){const td=document.createElement('td');td.textContent=text;td.style.padding='10px';tr.append(td);}applicationTable.append(tr);}
      add('h3','Ciclo integrado — recebimento, validação, cálculo e preservação');
      const fullCycle=rehearseUpdateCycle({asset:previous,calculate,responses:[makeRow(cases[0]),makeRow(cases[1]),makeRow(cases[2]),{...makeRow(cases[0]),ok:false}]});
      add('p',`Ciclo fictício: ${fullCycle.refresh.requested} respostas simuladas · ${fullCycle.prepared} atualização preparada na cópia · ${fullCycle.preserved} estados preservados · Aplicados ao operacional: ${fullCycle.operationalApplied}.`);
      for(const [index,outcome] of fullCycle.outcomes.entries())add('p',`Etapa ${index+1}: ${outcome.status}.`);
      add('p',`Score final da cópia fictícia: ${fullCycle.candidates[0].buyScore}. Dados preservados após as respostas incompleta, antiga e com falha. Nenhum score de teste conta como fundamento verificado na plataforma.`);
      add('h3','Publicação — ensaio somente em cópia fictícia');
      const publicationCandidate={...structuredClone(successful.asset),fundamentalsProvenance:{...cases[0].asset.provenance}};
      const publicationNow=new Date().toISOString();
      const publicationCases=[['Candidato válido',{}],['Base alterada durante a preparação',{current:{...previous,buyScore:56}}],['Candidato vencido antes de publicar',{now:new Date(Date.parse(publicationNow)+72*3600000).toISOString()}]];
      for(const [label,options] of publicationCases){const result=rehearsePublication({base:previous,current:previous,candidate:publicationCandidate,now:publicationNow,...options});add('p',`${label}: ${result.status} · Aplicados ao operacional: ${result.operationalApplied}.`);}
      add('p','Sem consultas ao EODHD, sem armazenamento e sem autorização de decisões. Atualização com dados reais continua pendente.');
      const close=add('button','Fechar simulação');close.type='button';close.onclick=()=>{dialog.close();dialog.remove();};
      document.body.append(dialog);dialog.showModal();
    }catch(error){alert(String(error?.message||error));}
    finally{button.disabled=false;}
  });
  bar.append(button);
}
