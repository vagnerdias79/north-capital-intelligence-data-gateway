import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');

test('automatically refreshes a clean or stale production session',()=>{
  assert.match(html,/function scheduleAutomaticRefresh\(restoredState\)/);
  assert.match(html,/Date\.now\(\)-restoredAt\)>=15\*60\*1000/);
  assert.match(html,/const restoredState=restore\(\);\s*scheduleAutomaticRefresh\(restoredState\);/);
  assert.match(html,/queueMicrotask\(start\)/);
});

test('reconciles the frozen position anchor instead of post-baseline operations',()=>{
  assert.match(html,/function localBaselinePortfolio\(\)/);
  assert.match(html,/Array\.isArray\(state\?\.positionAnchor\)\?state\.positionAnchor:\[\]/);
  assert.match(html,/function localOperationalPortfolio\(\)/);
  assert.match(html,/const localRows=localBaselinePortfolio\(\)/);
  assert.match(html,/postBaselineOperations:true/);
  assert.doesNotMatch(html,/function localPortfolio\(\)/);
});
