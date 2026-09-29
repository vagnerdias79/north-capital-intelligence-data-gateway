import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluate, evaluateValuation } from '../lib/radar/fundamentals-provenance.js';

const data={
  profitMargin:.21,operatingMargin:.28,returnOnEquity:.34,
  revenueGrowthYoY:.18,earningsGrowthYoY:.22,
  forwardPE:30,peg:1.5,priceToSales:8,analystTargetPrice:250
};
const now='2026-09-29T12:00:00.000Z';

test('accepts only traceable, fresh and complete fundamentals',()=>{
  const result=evaluate({provider:'Alpha Vantage',retrievedAt:'2026-09-29T10:00:00Z',sourcePeriodEnd:'2026-06-30',data},{now});
  assert.equal(result.status,'VERIFIED');
  assert.equal(result.eligible,true);
  assert.equal(result.writeOperationsEnabled,false);
});

test('does not confuse retrieval time with the reported accounting period',()=>{
  const result=evaluate({provider:'Alpha Vantage',retrievedAt:'2026-09-29T10:00:00Z',sourcePeriodEnd:null,data},{now});
  assert.equal(result.status,'UNKNOWN_DATE');
  assert.equal(result.eligible,false);
});

test('blocks stale retrievals and stale reported periods',()=>{
  assert.equal(evaluate({provider:'Alpha Vantage',retrievedAt:'2026-09-20',sourcePeriodEnd:'2026-06-30',data},{now}).status,'STALE_RETRIEVAL');
  assert.equal(evaluate({provider:'Alpha Vantage',retrievedAt:'2026-09-29',sourcePeriodEnd:'2025-12-31',data},{now}).status,'STALE_PERIOD');
});

test('blocks incomplete or untrusted datasets',()=>{
  assert.equal(evaluate({provider:'Unknown',retrievedAt:'2026-09-29',sourcePeriodEnd:'2026-06-30',data},{now}).status,'UNTRUSTED_SOURCE');
  const result=evaluate({provider:'Alpha Vantage',retrievedAt:'2026-09-29',sourcePeriodEnd:'2026-06-30',data:{profitMargin:.2}},{now});
  assert.equal(result.status,'INCOMPLETE');
  assert.deepEqual(result.missing,['quality','growth','valuation','upside']);
});

test('API and Radar expose the audited provenance contract',async()=>{
  const api=await readFile(new URL('../api/fundamentals.js',import.meta.url),'utf8');
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.match(api,/NCI_FUNDAMENTALS_PROVENANCE_V1/);
  assert.match(api,/sourcePeriodEnd:overviewResult\.sourcePeriodEnd/);
  assert.match(api,/sourcePublishedAt:null/);
  assert.match(api,/'no-store, max-age=0'/);
  assert.match(api,/complete,/);
  assert.match(html,/fundamentals-provenance\.js/);
  assert.match(html,/applyFundamentalsRow/);
  assert.match(html,/fundamentalsProvenance\?\.eligible===true/);
  assert.match(html,/valuationVerified/);
  assert.match(html,/evaluateValuation/);
  assert.match(html,/REFERÊNCIA PENDENTE/);
  assert.match(html,/verificados ·.*pendentes/);
  assert.match(html,/row\?\.provenance\?\.schemaVersion==='NCI_FUNDAMENTALS_PROVENANCE_V1'/);
  assert.match(html,/backendJSON\('\/api\/fundamentals\?symbols='/);
  assert.doesNotMatch(html,/backendJSON\('https:\/\/north-capital-intelligence-data-gat\.vercel\.app\/api\/fundamentals/);
  assert.match(html,/PROVIDER_LIMIT:'limite do provedor'/);
  assert.match(html,/localStorage\.removeItem\(FUND_CACHE_KEY\)/);
  assert.match(html,/i\+=3/);
  assert.match(html,/TRANSPORT_TIMEOUT:'timeout da consulta'/);
});

test('requires a dated reference before an approved valuation can pass',()=>{
  const verified=evaluateValuation({status:'FAIR',method:'HUMAN_REVIEW',reference:'NCI review 2026-09-29',assessedAt:'2026-09-29T10:00:00Z'},{now});
  assert.equal(verified.status,'VERIFIED');
  assert.equal(verified.eligible,true);
  assert.equal(evaluateValuation({status:'FAIR',method:'HUMAN_REVIEW',reference:'',assessedAt:'2026-09-29T10:00:00Z'},{now}).status,'REFERENCE_REQUIRED');
  assert.equal(evaluateValuation({status:'FAIR',method:'HUMAN_REVIEW',reference:'old review',assessedAt:'2026-07-01'},{now}).status,'STALE_REVIEW');
});
