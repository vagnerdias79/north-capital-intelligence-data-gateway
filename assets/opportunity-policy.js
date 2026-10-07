(function(root){
 'use strict';
 const limits=Object.freeze({version:'NCI_TACTICAL_LIMITS_2026-10-06',maxPositions:2,maxAggregateWeight:.15,etfMaxWeight:.15});
 const tactical=x=>x.allocationMode==='TACTICAL_OPPORTUNITY'||String(x.ticker).toUpperCase()==='INTR';
 function evaluate(positions,externalContribution=0){
   const active=positions.filter(x=>Number(x.qty)>0);
   const valid=active.length>0&&Number.isFinite(externalContribution)&&externalContribution>=0&&active.every(x=>Number.isFinite(Number(x.qty))&&Number.isFinite(Number(x.price))&&Number(x.price)>0);
   const total=valid?active.reduce((s,x)=>s+Number(x.qty)*Number(x.price),0)+externalContribution:0;
   const opportunities=active.filter(tactical);
   const used=valid?opportunities.reduce((s,x)=>s+Number(x.qty)*Number(x.price),0):null;
   return {valid,total,used,count:opportunities.length,weight:valid?used/total:null,remaining:valid?Math.max(0,total*limits.maxAggregateWeight-used):0,availableSlots:Math.max(0,limits.maxPositions-opportunities.length),limits};
 }
 function constrain(rows,positions,externalContribution=0){
   const summary=evaluate(positions,externalContribution);
   let remaining=summary.remaining;
   const active=new Set(positions.filter(x=>Number(x.qty)>0&&tactical(x)).map(x=>String(x.ticker).toUpperCase()));
   for(const row of rows){
     if(!tactical(row)||!(row.amount>0))continue;
     const key=String(row.ticker).toUpperCase();
     const proposed=row.amount;
     const slot=active.size<=limits.maxPositions&&(active.has(key)||active.size<limits.maxPositions);
     row.amount=summary.valid&&slot?Math.min(proposed,Math.floor((remaining+1e-9)*100)/100):0;
     remaining=Math.max(0,remaining-row.amount);
     if(row.amount>0)active.add(key);
     if(row.amount<proposed){row.reason='Limite tático: até 2 posições e 15% agregado da carteira USD; saldo permanece em reserva.';if(row.amount===0)row.state='NO ADD';}
   }
   return summary;
 }
 root.NCIOpportunityPolicy=Object.freeze({limits,tactical,evaluate,constrain});
})(globalThis);
