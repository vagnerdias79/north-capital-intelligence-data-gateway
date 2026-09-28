import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

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
