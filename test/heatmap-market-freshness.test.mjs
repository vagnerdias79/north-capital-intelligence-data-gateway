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
  assert.match(html,/Date\.now\(\)-oldest/);
  assert.match(html,/MERCADO \$\{stamp\}/);
  assert.match(html,/SNAPSHOT \$\{stamp\}/);
  assert.match(html,/cotações datadas/);
});

test('feeds confirmed operational monitor quotes back into the Heatmap source',()=>{
  assert.match(html,/const tickerMap=\{'BRK-B':'BRK\.B'\}/);
  assert.match(html,/item\.sourceTimestamp\|\|payload\.asOf/);
  assert.match(html,/source:'ENTRY_MONITOR'/);
});

test('never converts an absent Buy Score into zero in decision views',()=>{
  assert.match(html,/x\.buyScore==null\|\|x\.buyScore===''\?'PENDENTE'/);
  assert.match(html,/has=x\.buyScore!=null&&x\.buyScore!==''/);
  assert.match(html,/aguardando scores válidos/);
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
