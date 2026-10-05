import test from 'node:test';
import assert from 'node:assert/strict';
import {planFundamentals} from '../lib/fundamentals-universe.js';

test('held stocks receive coverage without treating ETFs, cash or unknown instruments as stocks', () => {
  const result = planFundamentals({
    positions: [{ticker:'SPGI',assetClass:'STOCK'}, {ticker:'VOO',assetClass:'ETF'}, {ticker:'TFLO',assetClass:'CASH'}, {ticker:'UNKNOWN'}],
    radar: [{ticker:'spgi'}, {ticker:'LLY'}],
    cachedRows: [{ticker:'SPGI',ok:true,valid:true}, {ticker:'LLY',ok:true,valid:false}, {ticker:'UNRELATED',ok:true,valid:true}],
    isEligible: row => row.valid === true
  });
  assert.deepEqual(result.pending, ['LLY']);
  assert.deepEqual(result.assets[0].scopes, ['RADAR','PORTFOLIO']);
  assert.equal(result.cached.length, 1);
  assert.deepEqual(result.separateReview.map(row=>row.ticker), ['VOO','TFLO','UNKNOWN']);
  assert.equal(result.writeOperationsEnabled, false);
});

test('cached data cannot become eligible without a provenance validator', () => {
  const result = planFundamentals({positions:[{ticker:'MSFT',assetClass:'STOCK'}],cachedRows:[{ticker:'MSFT',ok:true}]});
  assert.deepEqual(result.pending, ['MSFT']);
  assert.equal(result.cached.length, 0);
});
