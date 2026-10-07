(function(root){
  'use strict';
  const numeric=v=>typeof v==='number'&&Number.isFinite(v);
  const type=r=>String(r.type||r.action||'').toUpperCase();
  const relevant=r=>['SELL','DIVIDEND','INTEREST','TAX'].includes(type(r));
  function summarize(ledger,year){
    const rows=ledger.filter(r=>relevant(r)&&String(r.date).slice(0,4)===String(year));
    const income=rows.filter(r=>type(r)!=='TAX');
    // Operational funding FX / VET and current position averages are not fiscal evidence.
    const ready=r=>r.fiscal?.verified===true&&r.fiscal?.source&&numeric(r.fiscal?.incomeBrl);
    const pending=income.filter(r=>!ready(r));
    const known=income.filter(ready).reduce((s,r)=>s+r.fiscal.incomeBrl,0);
    return {year,rows,pending,knownIncomeBrl:known,estimatedGrossTaxBrl:income.length&&pending.length===0?Math.round(Math.max(0,known)*15)/100:null,
      sales:rows.filter(r=>type(r)==='SELL').length,withholdingUsd:rows.filter(r=>type(r)==='TAX').reduce((s,r)=>s+Math.abs(Number(r.value)||0),0)};
  }
  root.NCIAnnualTax={summarize};
  if(!root.document)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=(n,currency)=>numeric(n)?new Intl.NumberFormat('pt-BR',{style:'currency',currency}).format(n):'A apurar';
  const labels={SELL:'Venda',DIVIDEND:'Dividendo',INTEREST:'Juros',TAX:'Retenção no exterior'};
  let selectedYear=Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'America/Sao_Paulo'}).format(new Date()));
  let report;
  function csvCell(v){const s=String(v??'');return '"'+(/^[=+@-]/.test(s)?"'":'')+s.replace(/"/g,'""')+'"'}
  function exportCsv(){
    const data=[['Ano','Data','Ativo','Evento','Valor USD','Resultado fiscal BRL','Status','Fonte fiscal'],...report.rows.map(r=>[report.year,r.date,r.ticker,labels[type(r)],r.value,r.fiscal?.verified===true?r.fiscal.incomeBrl:'',type(r)==='TAX'?'Retenção; crédito fiscal a validar':r.fiscal?.verified===true&&r.fiscal?.source&&numeric(r.fiscal?.incomeBrl)?'Documentado':'Pendente',r.fiscal?.source||''])];
    const blob=new Blob(['\ufeff'+data.map(row=>row.map(csvCell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='NCI_Tributacao_'+selectedYear+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function render(){
    const target=document.getElementById('taxationContent');if(!target)return;
    const ledger=root.NCI_LEDGER||[];
    const years=[...new Set([selectedYear,...ledger.filter(relevant).map(r=>Number(String(r.date).slice(0,4))).filter(Number.isInteger)])].sort((a,b)=>b-a);
    report=summarize(ledger,selectedYear);
    const estimated=report.estimatedGrossTaxBrl;
    target.innerHTML=`<div class="toolbar"><div><h2>Tributação · Carteira USD</h2><p class="note">Pessoa física residente fiscal no Brasil · Acompanhamento anual</p></div><div class="actions"><label>Ano-calendário <select id="taxYear">${years.map(y=>`<option ${y===selectedYear?'selected':''}>${y}</option>`).join('')}</select></label><button id="taxExport" class="btn">Exportar relatório CSV</button></div></div>
    <div class="grid kpis"><div class="card kpi"><div class="label">Provisão estimada de IR anual</div><div class="value warning">${money(estimated,'BRL')}</div><div class="note">${estimated===null?'Dados fiscais incompletos':'Estimativa bruta · antes de créditos e perdas anteriores'}</div></div><div class="card kpi"><div class="label">Vendas realizadas</div><div class="value">${report.sales}</div><div class="note">Inclui vendas de TFLO</div></div><div class="card kpi"><div class="label">Retenções registradas no exterior</div><div class="value">${money(report.withholdingUsd,'USD')}</div><div class="note">Separadas do IR brasileiro</div></div><div class="card kpi"><div class="label">Eventos com pendências fiscais</div><div class="value warning">${report.pending.length}</div><div class="note">Vendas e rendimentos a documentar</div></div></div>
    <div class="card"><h3>Apuração anual · declaração de ${selectedYear+1}</h3><p>Para aplicações financeiras no exterior, a alíquota geral é de 15% no ajuste anual. Reinvestir o valor da venda não elimina a realização do ganho. Esta provisão não representa imposto vencido nem recolhimento mensal.</p><p class="note">Cálculo em reais: validar custo fiscal, câmbio das datas relevantes e rendimentos brutos. O câmbio dos aportes e o preço médio operacional não substituem esses dados. Perdas anteriores, créditos por imposto no exterior e outras contas devem ser conciliados na declaração. Retenções não são descontadas automaticamente desta estimativa.</p><p class="note">${report.pending.length?'Pendências: relatório fiscal da corretora, custo das posições vendidas, câmbio fiscal e documentação dos rendimentos. Enquanto houver pendências, a provisão permanece a apurar.':'Relatório de apoio; confirmar abrangência de todas as contas antes da declaração.'} Nenhum pagamento de IR brasileiro é presumido a partir dos eventos TAX.</p><a href="https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14754.htm" target="_blank" rel="noopener" style="color:var(--gold)">Lei 14.754/2023 · arts. 2º, 3º, 4º e 9º</a></div>
    <div class="card" style="margin-top:15px"><h3>Operações e rendimentos do ano</h3><div class="table-wrap"><table><thead><tr><th>Data</th><th>Ativo</th><th>Evento</th><th>Valor registrado USD</th><th>Resultado fiscal BRL</th><th>Documentação</th></tr></thead><tbody>${report.rows.length?report.rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.ticker)}</td><td>${esc(labels[type(r)])}</td><td>${money(Number(r.value),'USD')}</td><td>${type(r)==='TAX'?'Crédito a validar':money(r.fiscal?.verified===true&&r.fiscal?.source?r.fiscal?.incomeBrl:null,'BRL')}</td><td>${type(r)==='TAX'?'Retenção registrada':r.fiscal?.verified===true&&r.fiscal?.source&&numeric(r.fiscal?.incomeBrl)?esc(r.fiscal.source):'Pendente · custo/câmbio fiscal'}</td></tr>`).join(''):'<tr><td colspan="6">Nenhum evento registrado neste ano. Isso não confirma ausência de imposto em outras contas.</td></tr>'}</tbody></table></div><p class="note">Exportação inclui pendências. O relatório da corretora será usado para conciliar a apuração; não substitui a declaração.</p></div>`;
    target.querySelector('#taxYear').onchange=e=>{selectedYear=Number(e.target.value);render()};
    target.querySelector('#taxExport').onclick=exportCsv;
  }
  root.NCIAnnualTax.render=render;
  ['nci:data-updated','nci:data-layer-shadow','nci:tax-dashboard-preview'].forEach(name=>root.addEventListener(name,render));
  document.querySelector('[data-screen="taxation"]')?.addEventListener('click',render);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})(typeof window==='undefined'?globalThis:window);
