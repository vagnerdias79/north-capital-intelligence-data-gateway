import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const code=fs.readFileSync(new URL('../assets/annual-tax.js',import.meta.url),'utf8');
const context={};vm.runInNewContext(code,context);const summarize=context.NCIAnnualTax.summarize;
test('missing fiscal evidence never displays zero tax or uses funding FX',()=>{
 const r=summarize([{date:'2026-08-13',type:'SELL',value:100,fxRate:5.2}],2026);
 assert.equal(r.estimatedGrossTaxBrl,null);assert.equal(r.pending.length,1);
});
test('annual realized gains and losses net without automatically deducting withholding',()=>{
 const r=summarize([{date:'2026-01-01',type:'SELL',fiscal:{verified:true,source:'Informe',incomeBrl:1000}},{date:'2026-01-02',type:'SELL',fiscal:{verified:true,source:'Informe',incomeBrl:-200}},{date:'2026-01-03',type:'TAX',value:-30}],2026);
 assert.equal(r.estimatedGrossTaxBrl,120);assert.equal(r.withholdingUsd,30);
});
test('annual loss never becomes negative tax and years remain isolated',()=>{
 const r=summarize([{date:'2026-01-01',type:'SELL',fiscal:{verified:true,source:'Informe',incomeBrl:-100}},{date:'2025-01-01',type:'SELL',value:100}],2026);
 assert.equal(r.estimatedGrossTaxBrl,0);assert.equal(r.sales,1);
});
test('unverified or null fiscal values and dividends block estimate; tax alone is not payment',()=>{
 for(const fiscal of [{verified:true,source:'Informe',incomeBrl:null},{verified:false,source:'Informe',incomeBrl:50},{verified:true,incomeBrl:50}])assert.equal(summarize([{date:'2026-01-01',type:'DIVIDEND',fiscal}],2026).estimatedGrossTaxBrl,null);
 assert.equal(summarize([{date:'2026-01-01',type:'TAX',value:-1}],2026).estimatedGrossTaxBrl,null);
});
