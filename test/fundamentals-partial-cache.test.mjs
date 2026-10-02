import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf(' async function refreshFundamentals(){');
const source=html.slice(start,html.indexOf('\n function normalizeRadar(){',start));
const row=(ticker,age=0)=>({ticker,ok:true,provenance:{schemaVersion:'NCI_FUNDAMENTALS_PROVENANCE_V1',retrievedAt:new Date(Date.now()-age).toISOString()}});
function setup(cached,backend){
 let saved=JSON.stringify({rows:cached});const calls=[];
 const context={window:{RADAR:['A','B','C','D'].map(ticker=>({ticker}))},DB:{},localStorage:{getItem:()=>saved,setItem:(_,value)=>{saved=value}},Date,Map,Number,JSON,applyFundamentalsRow:()=>true,recalculateRadarBuyScores:()=>{},backendJSON:async url=>{calls.push(decodeURIComponent(url.split('=')[1]));return backend(calls.length)}};
 return {run:vm.runInNewContext(source+';refreshFundamentals',context),calls,saved:()=>JSON.parse(saved).rows};
}
test('partial success survives provider limit; next refresh fetches only remaining symbols',async()=>{
 const first=setup([row('A')],async()=>({configured:true,rateLimited:true,fundamentals:[row('B'),{ticker:'C',ok:false,rateLimited:true}]}));
 const result=await first.run();assert.equal(result.updated,2);assert.equal(result.failed,2);assert.equal(result.status,'PARTIAL');assert.deepEqual(first.calls,['B,C,D']);assert.deepEqual(first.saved().map(x=>x.ticker),['A','B']);
 const second=setup(first.saved(),async()=>({configured:true,fundamentals:[row('C'),row('D')]}));
 assert.equal((await second.run()).updated,4);assert.deepEqual(second.calls,['C,D']);
});
test('expired records are fetched again; timeout preserves fresh records',async()=>{
 const state=setup([row('A'),row('B',21*3600000)],async()=>{throw new Error('timeout')});
 const result=await state.run();assert.deepEqual(state.calls,['B,C,D']);assert.equal(result.updated,1);assert.equal(result.failed,3);assert.equal(result.dominantReason,'TRANSPORT_TIMEOUT');assert.deepEqual(state.saved().map(x=>x.ticker),['A']);
});
test('valid cache avoids provider calls without renewing retrieval dates',async()=>{
 const rows=['A','B','C','D'].map(t=>row(t));const state=setup(rows,()=>{throw Error('unexpected call')});
 assert.equal((await state.run()).status,'CACHED');assert.equal(state.calls.length,0);assert.deepEqual(state.saved(),rows);
});
