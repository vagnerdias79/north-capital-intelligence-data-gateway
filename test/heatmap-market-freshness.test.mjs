import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');

test('carries quote timestamp and source into the portfolio read model',()=>{
  assert.match(html,/pos\.marketAsOf=m\.asOf\|\|null/);
  assert.match(html,/pos\.marketSource=m\.source\|\|null/);
  assert.match(html,/function setMarketPrice\(ticker,price,asOf=DB\.meta\.asOf,source=null\)/);
});

test('labels the Heatmap as current market or dated snapshot',()=>{
  assert.match(html,/function marketFreshness\(positions\)/);
  assert.match(html,/const oldest=timestamps\.length\?Math\.min\(\.\.\.timestamps\):null/);
  assert.match(html,/serverNow-oldest/);
  assert.match(html,/MERCADO \$\{stamp\}/);
  assert.match(html,/SNAPSHOT \$\{stamp\}/);
  assert.match(html,/cotações datadas/);
});

test('feeds confirmed operational monitor quotes back into the Heatmap source',()=>{
  assert.match(html,/const tickerMap=\{'BRK-B':'BRK\.B'\}/);
  assert.match(html,/item\.quoteTimestamp\|\|null/);
  assert.match(html,/source:'ENTRY_MONITOR'/);
});

test('never converts an absent Buy Score into zero in decision views',()=>{
  assert.match(html,/x\.buyScore==null\|\|x\.buyScore===''\?'PENDENTE'/);
  assert.match(html,/has=x\.buyScore!=null&&x\.buyScore!==''/);
});

const setter=html.slice(html.indexOf(' function setMarketPrice('),html.indexOf(' function portfolioMetrics('));

test('late operational snapshots cannot overwrite newer quotes in either completion order',()=>{
  for(const order of [['new','old'],['old','new']]){
    const context={DB:{meta:{}},NCI_MARKET_SNAPSHOT:{},syncReadModel(){}};
    runInNewContext(setter,context);
    const quotes={new:[110,'2026-09-30T19:16:00Z'],old:[100,'2026-09-30T13:30:00Z']};
    for(const key of order)context.setMarketPrice('MSFT',...quotes[key],key);
    assert.equal(context.NCI_MARKET_SNAPSHOT.MSFT.price,110);
    assert.equal(context.NCI_MARKET_SNAPSHOT.MSFT.source,'new');
    assert.equal(context.setMarketPrice('MSFT',90,'invalid','invalid'),false);
    assert.equal(context.NCI_MARKET_SNAPSHOT.MSFT.price,110);
  }
});

const freshness=html.slice(html.indexOf(' function marketFreshness('),html.indexOf(' function scale('));
test('Heatmap uses oldest provider quote across a new server sync',()=>{
 const ctx={window:{NCI_SERVER_CLOCK:{now:()=>Date.parse('2026-10-01T11:45:00Z')}}};
 runInNewContext(freshness,ctx);
 const result=ctx.marketFreshness([{marketAsOf:'2026-09-30T20:00:00Z'},{marketAsOf:'2026-09-30T20:04:00Z'}]);
 assert.equal(result.fresh,false);
 assert.match(result.label,/SNAPSHOT/);
 assert.match(result.stamp,/17:00/);
 assert.equal(ctx.marketFreshness([{marketAsOf:null}]).fresh,false);
});

test('operational adapter keeps quote time separate from daily bar time',async()=>{
 const {createRequire}=await import('node:module');
 const require=createRequire(import.meta.url);
 const {quoteToMarketSnapshot}=require('../lib/rebalancing/market-data-adapter.js');
 const value=quoteToMarketSnapshot({ticker:'MSFT',price:512.9,return1d:0,return5d:0,return20d:0,return60d:0,volatility20d:0.02,gapPct:0,volumeRatio:1,quoteTimestamp:'2026-09-30T20:00:01Z',sourceTimestamp:'2026-09-30T13:30:00Z',source:'Yahoo'});
 assert.equal(value.quoteTimestamp,'2026-09-30T20:00:01Z');
 assert.equal(value.sourceTimestamp,'2026-09-30T13:30:00Z');
});
