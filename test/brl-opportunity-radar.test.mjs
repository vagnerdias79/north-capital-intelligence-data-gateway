import test from 'node:test';
import assert from 'node:assert/strict';
import radar from '../lib/brl/opportunity-radar.js';

function fixture() {
  return {
    portfolio: {
      currency: 'BRL', audited: true, asOf: '2026-09-25', totalValueBrl: 100000,
      equityValueBrl: 10000, equityLimitBrl: 20000, stockCapDenominatorBrl: 100000,
      positions: [{ ticker: 'ITUB4', valueBrl: 1000 }]
    },
    capital: { audited: true, availableBrl: 10000, emergencyReserveBrl: 6000, earmarkedBrl: 1000 },
    candidates: [{ ticker: 'ITUB4', assetClass: 'STOCK', currency: 'BRL', priceBrl: 30,
      priceStatus: 'CURRENT', fundamentalsStatus: 'CURRENT', thesisState: 'INTACT',
      hardFilterPass: true, qualityScore: 85, fairValueBrl: 50, requiredMarginOfSafety: 0.20,
      expectedReturn: 0.15, requiredReturn: 0.10, averageCostBrl: 35,
      capitalStatus: 'ADD_ALLOWED', scores: { quality: 85, valuation: 80, conviction: 75,
        rebalance: 70, expectedReturn: 75, diversification: 80, risk: 75 } }]
  };
}

test('unreconciled BRL positions block every result', () => {
  const x = fixture(); x.portfolio.audited = false;
  assert.equal(radar.screenBrlOpportunities(x).status, 'BLOCKED');
  assert.deepEqual(radar.screenBrlOpportunities(x).rows, []);
});

test('emergency reserve and earmarked money remain outside investable pool', () => {
  const r = radar.screenBrlOpportunities(fixture());
  assert.equal(r.deployableBrl, 3000);
  assert.equal(r.rows[0].shares, 100);
  assert.equal(r.rows[0].indicativeAmountBrl, 3000);
  assert.equal(r.ordersCreated, 0);
});

test('price below average cost never overrides stale fundamentals', () => {
  const x = fixture(); x.candidates[0].fundamentalsStatus = 'STALE';
  const row = radar.screenBrlOpportunities(x).rows[0];
  assert.equal(row.belowAverageCost, true);
  assert.equal(row.state, 'REVIEW');
  assert.equal(row.shares, 0);
});

test('Brazil equity and individual stock caps limit whole-share budget', () => {
  const x = fixture();
  x.capital.availableBrl = 30000;
  x.portfolio.equityValueBrl = 19000;
  assert.equal(radar.screenBrlOpportunities(x).rows[0].shares, 33);
  x.portfolio.equityValueBrl = 10000;
  x.portfolio.positions[0].valueBrl = 9400;
  assert.equal(radar.screenBrlOpportunities(x).rows[0].shares, 20);
});

test('new asset requires Radar promotion even with attractive valuation', () => {
  const x = fixture(); x.candidates[0].ticker = 'WEGE3';
  assert.ok(radar.screenBrlOpportunities(x).rows[0].reasons.includes('RADAR_GATES_NOT_APPROVED'));
});
