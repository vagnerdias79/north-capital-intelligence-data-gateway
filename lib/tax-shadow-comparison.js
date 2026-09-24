import { normalizeTaxCashEffect } from './tax-cash-effect.js';

function roundMoney(value) {
  return Number(Number(value).toFixed(8));
}

export function compareTaxShadowRows(rows) {
  const events = rows.map(row => {
    const normalized = normalizeTaxCashEffect(row);
    const legacy = normalizeTaxCashEffect({
      type:'TAX',
      value:row?.metadata?.raw?.value
    });
    const difference = roundMoney(normalized.cashEffect - legacy.cashEffect);

    return {
      reference:String(row.external_ref ?? ''),
      ticker:row.ticker ?? null,
      normalizedCashEffect:normalized.cashEffect,
      legacyCashEffect:legacy.cashEffect,
      difference,
      equivalent:difference === 0
    };
  });

  const normalizedTotal = roundMoney(events.reduce((sum, event) => sum + event.normalizedCashEffect, 0));
  const legacyTotal = roundMoney(events.reduce((sum, event) => sum + event.legacyCashEffect, 0));
  const divergences = events.filter(event => !event.equivalent);

  return {
    eventCount:events.length,
    normalizedTotal,
    legacyTotal,
    totalDifference:roundMoney(normalizedTotal - legacyTotal),
    equivalent:divergences.length === 0 && normalizedTotal === legacyTotal,
    divergences,
    events,
    writeOperationsEnabled:false
  };
}
