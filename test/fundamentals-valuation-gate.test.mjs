import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluate } from '../lib/radar/fundamentals-valuation-gate.js';

const approved={
  thesisStatus:'VALID',valuationStatus:'FAIR',dataComplete:true,buyScore:75,
  priceActionState:'NORMAL'
};

test('blocks conclusions when fundamental data is incomplete',()=>{
  const result=evaluate({...approved,dataComplete:false,priceActionState:'PULLBACK'});
  assert.equal(result.decision,'BLOCKED_DATA');
  assert.equal(result.decisionAuthorization,false);
  assert.equal(result.writeOperationsEnabled,false);
});

test('does not treat a pullback as an opportunity without a valid thesis',()=>{
  const result=evaluate({...approved,thesisStatus:'VALIDATING',priceActionState:'PULLBACK'});
  assert.equal(result.decision,'BLOCKED_THESIS');
});

test('routes pullback with pending valuation to manual valuation review',()=>{
  const result=evaluate({...approved,valuationStatus:'PENDING',priceActionState:'PULLBACK'});
  assert.equal(result.decision,'VALIDATE_VALUATION');
  assert.equal(result.automaticPromotion,false);
});

test('routes convergent price and fundamentals only to human review',()=>{
  const result=evaluate({...approved,priceActionState:'PULLBACK'});
  assert.equal(result.decision,'REVIEW_ENTRY');
  assert.equal(result.signalScope,'ANALYSIS_ONLY');
  assert.equal(result.decisionAuthorization,false);
});

test('waits when price is extended even with approved fundamentals',()=>{
  assert.equal(evaluate({...approved,priceActionState:'EXTENDED'}).decision,'WAIT_PRICE');
  assert.equal(evaluate({...approved,priceActionState:'SPIKE'}).decision,'WAIT_PRICE');
});

test('integrates the phase 3.2 decision gate into the Radar card',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/fundamentals-valuation-gate\.js/);
  assert.match(html,/GATE 3\.2 · FUNDAMENTOS \+ VALUATION/);
  assert.match(html,/aporte autorizado: NÃO/);
  assert.match(html,/decisionGate/);
});
