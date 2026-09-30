import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import handler from '../api/quotes.js';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const clock=html.match(/<script id="nci-server-clock-v1">([\s\S]*?)<\/script>/)[1];
const freshness=html.slice(html.indexOf(' function marketFreshness('),html.indexOf(' function scale('));
test('server clock and freshness ignore workstation offset and timezone',()=>{
 for(const offset of [-3600000,0,3600000]){
  let elapsed=100;
  class SkewedDate extends Date{static now(){return super.now()+offset}}
  const c={window:{},performance:{now:()=>elapsed},Date:SkewedDate};
  runInNewContext(clock+freshness,c);
  assert.equal(c.window.NCI_SERVER_CLOCK.now(),null);
  const positions=[{marketAsOf:'2026-09-30T19:30:00Z'}];
  assert.equal(c.marketFreshness(positions).fresh,false);
  assert.equal(c.window.NCI_SERVER_CLOCK.observe('invalid'),false);
  c.window.NCI_SERVER_CLOCK.observe('2026-09-30T19:31:00Z');
  assert.equal(c.marketFreshness(positions).fresh,true);
  assert.match(c.marketFreshness(positions).stamp,/16:30/);
  assert.equal(c.marketFreshness([{marketAsOf:'2026-09-30T20:00:00Z'}]).fresh,false);
  elapsed+=31*60000;
  assert.equal(c.marketFreshness(positions).fresh,false);
 }
});
test('existing quotes endpoint returns server time without caching or provider calls',async()=>{
 const before=Date.now();let body;const headers={};
 await handler({query:{clock:'1'}}, {setHeader(k,v){headers[k]=v},status(code){assert.equal(code,200);return this},json(value){body=value}});
 assert.match(headers['Cache-Control'],/no-store/);
 assert.ok(Date.parse(body.serverTime)>=before&&Date.parse(body.serverTime)<=Date.now());
});

test('quote refresh uses deployment API and prefers actual provider quote time',async()=>{
 const code=html.slice(html.indexOf(' async function refreshPrices(){'),html.indexOf(' const BUY_SCORE_MODEL='));
 let requested;let applied;
 const radar={ticker:'TEST'};
 const c={window:{RADAR:[radar],NCI_DATABASE:{setMarketPrice(...args){applied=args}}},DB:{meta:{asOf:'2026-09-30T13:30:00Z'}},allSymbols:()=>['TEST'],recalculateRadarBuyScores(){},backendJSON:async url=>{
 requested=url;return {quotes:[{ticker:'TEST',ok:true,price:100,source:'Yahoo',quoteTimestamp:'2026-09-30T20:00:00Z',sourceTimestamp:'2026-09-30T13:30:00Z'}]};
 }};
 runInNewContext(code,c);
 const result=await c.refreshPrices();
 assert.equal(requested,'/api/quotes?symbols=TEST');
 assert.equal(result.ok,1);
 assert.equal(applied[2],'2026-09-30T20:00:00Z');
 assert.equal(radar.marketAsOf,'2026-09-30T20:00:00Z');
});
