import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import handler from '../api/time.js';
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
test('time endpoint returns server time without caching',()=>{
 const before=Date.now();let body;const headers={};
 handler({}, {setHeader(k,v){headers[k]=v},status(code){assert.equal(code,200);return this},json(value){body=value}});
 assert.match(headers['Cache-Control'],/no-store/);
 assert.ok(Date.parse(body.serverTime)>=before&&Date.parse(body.serverTime)<=Date.now());
});
