'use strict';

// BRL opportunity screening. Pure, read-only, and deliberately fail-closed.
// All amounts and prices are BRL; no USD conversion or trade execution.
const SCORE_WEIGHTS = Object.freeze({
  quality: 25, valuation: 20, conviction: 15, rebalance: 10,
  expectedReturn: 10, diversification: 10, risk: 10
});

function finiteNonnegative(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function screenBrlOpportunities({ portfolio, capital, candidates } = {}) {
  const blockers = [];
  if (!portfolio || portfolio.currency !== 'BRL' || portfolio.audited !== true ||
      !finiteNonnegative(portfolio.totalValueBrl) || portfolio.totalValueBrl <= 0 ||
      !finiteNonnegative(portfolio.equityValueBrl) ||
      !finiteNonnegative(portfolio.equityLimitBrl) ||
      portfolio.equityLimitBrl > portfolio.totalValueBrl * 0.20 + 0.01 ||
      !finiteNonnegative(portfolio.stockCapDenominatorBrl) ||
      portfolio.stockCapDenominatorBrl <= 0 ||
      !Array.isArray(portfolio.positions) ||
      !portfolio.positions.every(p => p && typeof p.ticker === 'string' &&
        finiteNonnegative(p.valueBrl)) || !portfolio.asOf) {
    blockers.push('BRL_PORTFOLIO_NOT_AUDITED');
  }
  if (!capital || !finiteNonnegative(capital.availableBrl) ||
      !finiteNonnegative(capital.emergencyReserveBrl) ||
      !finiteNonnegative(capital.earmarkedBrl) || capital.audited !== true) {
    blockers.push('BRL_CAPITAL_NOT_RECONCILED');
  }
  if (!Array.isArray(candidates)) blockers.push('BRL_CANDIDATES_MISSING');
  if (blockers.length) return { mode: 'READ_ONLY', status: 'BLOCKED', blockers, rows: [] };

  // The reserve and earmarked funds are excluded before screening any equity.
  const deployableBrl = Math.max(0, capital.availableBrl - capital.emergencyReserveBrl - capital.earmarkedBrl);
  const equityHeadroomBrl = Math.max(0, portfolio.equityLimitBrl - portfolio.equityValueBrl);

  const rows = candidates.map((asset) => {
    const reasons = [];
    const ticker = String(asset?.ticker || '').trim().toUpperCase();
    if (!ticker || !/^([A-Z0-9]{4,7})$/.test(ticker)) reasons.push('INVALID_TICKER');
    if (asset?.currency !== 'BRL' || asset?.assetClass !== 'STOCK') reasons.push('NOT_BRL_STOCK');
    if (!finiteNonnegative(asset?.priceBrl) || asset.priceBrl <= 0 || asset.priceStatus !== 'CURRENT')
      reasons.push('PRICE_MISSING_OR_STALE');
    if (asset?.fundamentalsStatus !== 'CURRENT') reasons.push('FUNDAMENTALS_MISSING_OR_STALE');
    if (asset?.thesisState !== 'INTACT' && asset?.thesisState !== 'STRENGTHENING')
      reasons.push('THESIS_NOT_VALIDATED');
    if (asset?.hardFilterPass !== true) reasons.push('HARD_FILTER_NOT_PASSED');
    if (!finiteNonnegative(asset?.qualityScore) || asset.qualityScore < 75)
      reasons.push('QUALITY_GATE_NOT_PASSED');
    if (!finiteNonnegative(asset?.fairValueBrl) || asset.fairValueBrl <= 0 ||
        !finiteNonnegative(asset?.requiredMarginOfSafety) ||
        !finiteNonnegative(asset?.expectedReturn) ||
        !finiteNonnegative(asset?.requiredReturn)) reasons.push('VALUATION_INCOMPLETE');
    else if (asset.priceBrl > asset.fairValueBrl * (1 - asset.requiredMarginOfSafety) ||
             asset.expectedReturn < asset.requiredReturn) reasons.push('VALUATION_NOT_ATTRACTIVE');
    if (asset?.capitalStatus === 'HOLD_ONLY' || asset?.capitalStatus === 'BLOCKED')
      reasons.push('NEW_CAPITAL_BLOCKED');
    const previousValue = portfolio.positions
      .filter((p) => String(p.ticker || '').toUpperCase() === ticker)
      .reduce((sum, p) => sum + p.valueBrl, 0);
    if (previousValue <= 0 && asset?.stage !== 'ENTRY CANDIDATE')
      reasons.push('RADAR_GATES_NOT_APPROVED');
    const positionHeadroomBrl = Math.max(0, portfolio.stockCapDenominatorBrl * 0.10 - previousValue);
    const budgetBrl = Math.min(deployableBrl, equityHeadroomBrl, positionHeadroomBrl);
    const shares = asset.priceBrl > 0 ? Math.floor((budgetBrl + 1e-8) / asset.priceBrl) : 0;
    if (deployableBrl <= 0) reasons.push('NO_DEPLOYABLE_CAPITAL');
    if (equityHeadroomBrl <= 0) reasons.push('BRL_EQUITY_LIMIT_REACHED');
    if (positionHeadroomBrl <= 0) reasons.push('STOCK_CONCENTRATION_LIMIT_REACHED');
    if (shares <= 0) reasons.push('LESS_THAN_ONE_SHARE');

    const scores = asset.scores || {};
    const scoresComplete = Object.keys(SCORE_WEIGHTS)
      .every((key) => finiteNonnegative(scores[key]) && scores[key] <= 100);
    if (!scoresComplete) reasons.push('SCORES_INCOMPLETE');
    const score = scoresComplete ? Object.entries(SCORE_WEIGHTS)
      .reduce((total, [key, weight]) => total + scores[key] * weight / 100, 0) : null;

    return {
      ticker, currency: 'BRL', state: reasons.length ? 'REVIEW' : 'ELIGIBLE_FOR_HUMAN_DECISION',
      reasons, score, priceBrl: asset.priceBrl || null,
      shares: reasons.length ? 0 : shares,
      indicativeAmountBrl: reasons.length ? 0 : Math.round(shares * asset.priceBrl * 100) / 100,
      // A price below cost basis is an observation, never an eligibility gate.
      belowAverageCost: finiteNonnegative(asset.averageCostBrl) && asset.priceBrl < asset.averageCostBrl
    };
  });
  rows.sort((a, b) => (b.state === 'ELIGIBLE_FOR_HUMAN_DECISION') - (a.state === 'ELIGIBLE_FOR_HUMAN_DECISION') ||
    (b.score ?? -1) - (a.score ?? -1));
  return { mode: 'READ_ONLY', status: 'SCREENED', currency: 'BRL', asOf: portfolio.asOf,
    deployableBrl, equityHeadroomBrl, rows, ordersCreated: 0 };
}

module.exports = { SCORE_WEIGHTS, screenBrlOpportunities };
