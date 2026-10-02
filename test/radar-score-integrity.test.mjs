import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf(' const BUY_SCORE_MODEL=');
const end=html.indexOf(' function recalculateRadarBuyScores()',start);
const context=vm.createContext({});
vm.runInContext(html.slice(start,end)+';globalThis.calculate=calculateBuyScore;',context);
const asset=()=>({price:100,fundamentalsProvenance:{eligible:true},fundamentals:{profitMargin:.2,operatingMargin:.25,returnOnEquity:.3,revenueGrowthYoY:.15,earningsGrowthYoY:.2,forwardPE:25,peg:1.2,priceToSales:5,analystTargetPrice:120}});
test('missing optional beta is excluded rather than rewarded as zero risk',()=>{
 const a=asset();a.fundamentals.beta=null;context.calculate(a);
 assert.equal(a.buyScoreDetails.factors.risk,null);
 assert.equal(a.buyScoreDetails.availableWeight,95);
});
test('null and empty growth values keep the score pending',()=>{
 for(const missing of [null,'',undefined]){
  const a=asset();a.fundamentals.earningsGrowthYoY=missing;
  assert.equal(context.calculate(a),null);
  assert.ok(a.buyScoreDetails.missing.includes('crescimento'));
 }
});
test('a reported zero remains a valid observation',()=>{
 const a=asset();a.fundamentals.earningsGrowthYoY=0;
 assert.equal(typeof context.calculate(a),'number');
});

 test('score card distinguishes absent observations from reported zero',()=>{
 const start=html.indexOf("const bd=x.buyScoreDetails||{}");
 const end=html.indexOf(';return',start);
 const expression=html.slice(start,end);
 for(const value of [null,undefined,'']){
  const result=vm.runInNewContext('(()=>{'+expression+';return [pc(f.quality),up];})()', {x:{buyScoreDetails:{factors:{quality:value},upsideRaw:value}}});
  assert.deepEqual(Array.from(result),['—','—']);
 }
 const zero=vm.runInNewContext('(()=>{'+expression+';return [pc(f.quality),up];})()', {x:{buyScoreDetails:{factors:{quality:0},upsideRaw:0}}});
 assert.deepEqual(Array.from(zero),['0','0.0%']);
 });
