import { assessRadarCandidate } from './eodhd-radar-guard.js';
import { normalize, metricPaths } from './eodhd-normalize.js';
export function reviewSample(raw, retrievedAt=new Date().toISOString()) {
  const code=raw?.General?.Code;
  if(typeof code!=='string')throw new Error('Arquivo sem identificação do ativo.');
  const row=normalize(code,raw,{retrievedAt,sample:true});
  return {...row,reviewStatus:row.validation.missingMetrics.length?'INCOMPLETE':'STRUCTURALLY_VALID',
    operationallyReady:false,radarGate:assessRadarCandidate(row,{now:retrievedAt})};
}
const labels={profitMargin:'Margem líquida do provedor',operatingMargin:'Margem operacional',returnOnEquity:'ROE',revenueGrowthYoY:'Crescimento da receita',earningsGrowthYoY:'Crescimento do lucro',forwardPE:'P/L futuro',peg:'PEG',priceToSales:'Preço/receita',analystTargetPrice:'Preço-alvo'};
const percentFields=new Set(['profitMargin','operatingMargin','returnOnEquity','revenueGrowthYoY','earningsGrowthYoY']);
function element(tag,text){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;}
function display(field,value){return value===null?'Indisponível':percentFields.has(field)?`${(value*100).toFixed(2)}%`:String(value);}
export function mountSampleReview(root,getToken) {
  if(root.dataset.mounted)return;
  root.dataset.mounted='true';root.hidden=false;
  root.append(element('h2','Validação de amostras EODHD'));
  root.append(element('p','Selecione os JSON recebidos do suporte. Leitura local, sem envio dos arquivos, armazenamento ou consulta ao provedor. Amostras não alimentam o Radar.'));
  const input=element('input');input.type='file';input.accept='.json,application/json';input.multiple=true;
  input.setAttribute('aria-label','Selecionar amostras JSON do EODHD');
  const button=element('button','Validar amostras locais'),status=element('p'),results=element('div');
  root.append(input,button,status,results);
  button.addEventListener('click',async()=>{
    button.disabled=true;results.replaceChildren();status.textContent='Validando acesso e arquivos...';
    try {
      const files=Array.from(input.files||[]);
      if(!files.length||files.length>4)throw new Error('Selecione de um a quatro arquivos JSON.');
      if(files.some(file=>file.size>5*1024*1024))throw new Error('Cada arquivo deve ter até 5 MB.');
      const token=await getToken();if(!token)throw new Error('Entre novamente com Google.');
      const response=await fetch('/api/fundamentals?provider=eodhd&mode=auth-test',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
      const access=await response.json();
      if(!response.ok||access.validation!=='PASS'||access.ownerMatch!==true)throw new Error('Valide a configuração do titular antes de abrir as amostras.');
      let valid=0,failed=0;
      for(const file of files) {
        try {
          const row=reviewSample(JSON.parse(await file.text()));
          const panel=element('section');panel.append(element('h3',`${row.ticker} — AMOSTRA / ${row.reviewStatus==='INCOMPLETE'?'campos ausentes':'estrutura válida'}`));
          panel.append(element('p',`Período: ${row.provenance.sourcePeriodEnd||'indisponível'} · Publicação: ${row.provenance.sourcePublishedAt||'indisponível'} · Atualização do provedor: ${row.provenance.providerUpdatedAt||'indisponível'}`));
          panel.append(element('p',`Moeda de negociação: ${row.provenance.currency||'indisponível'} · Demonstrativos: ${row.provenance.reportingCurrency||'indisponível'} · País de listagem: ${row.provenance.listingCountry||'indisponível'}`));
          const table=element('table');table.style.width='100%';const head=element('tr');for(const label of ['Indicador','Valor','Origem'])head.append(element('th',label));table.append(head);
          for(const [field,value] of Object.entries(row.data)){const tr=element('tr');for(const text of [labels[field],display(field,value),metricPaths[field]])tr.append(element('td',text));table.append(tr);}
          panel.append(table);
          const calc=row.statementMetrics;
          panel.append(element('p',calc.status==='CALCULATED'?`Margem calculada pelos demonstrativos: ${(calc.profitMargin*100).toFixed(2)}% · Método: ${calc.method} · Moeda: ${calc.reportingCurrency} · Períodos: ${calc.periods.join(', ')}`:`Margem calculada indisponível: ${calc.reason}`));
          panel.append(element('p',`Radar: BLOQUEADO para decisões · Motivos: ${row.radarGate.reasons.join(', ')} · Grupos insuficientes: ${Object.entries(row.radarGate.groupAssessment).filter(([,group])=>!group.complete).map(([name])=>name).join(', ')||'nenhum'}`));
          panel.append(element('p',`Diagnóstico: ${row.dataHealth.issues.join(', ')||'sem pendências estruturais detectadas'} · Limite do período: ${row.dataHealth.maxReportedPeriodAgeDays} dias. O período do resumo Highlights não foi verificado.`));
          panel.append(element('p','Validação estrutural local. Sem verificação independente da empresa, atualização automática ou autorização de decisões.'));
          results.append(panel);valid++;
        }catch{results.append(element('p',`${file.name}: arquivo inválido ou ativo não suportado. Nenhum dado aplicado.`));failed++;}
      }
      status.textContent=`Concluído: ${valid} amostra(s) lida(s), ${failed} rejeitada(s). Nenhum dado aplicado à plataforma.`;
    }catch(error){status.textContent=String(error?.message||error);}
    finally{button.disabled=false;input.value='';}
  });
}
