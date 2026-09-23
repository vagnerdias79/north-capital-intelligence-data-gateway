function finiteAmount(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundMoney(value) {
  return Number(Number(value).toFixed(8));
}

export function normalizeTaxCashEffect(row) {
  const type = String(row?.transaction_type ?? row?.type ?? row?.action ?? '').toUpperCase();
  if (type !== 'TAX') throw new Error('TAX_EVENT_REQUIRED');

  const fields = [
    ['tax_amount', finiteAmount(row?.tax_amount ?? row?.taxAmount)],
    ['gross_amount', finiteAmount(row?.gross_amount ?? row?.grossAmount)],
    ['value', finiteAmount(row?.value)]
  ];
  const nonZero = fields.filter(([, value]) => value !== null && value !== 0);
  if (nonZero.length === 0) throw new Error('TAX_AMOUNT_MISSING');

  const magnitudes = [...new Set(nonZero.map(([, value]) => roundMoney(Math.abs(value))))];
  if (magnitudes.length !== 1) throw new Error('AMBIGUOUS_TAX_REPRESENTATION');

  return {
    cashEffect:roundMoney(-magnitudes[0]),
    amount:magnitudes[0],
    sourceFields:nonZero.map(([field]) => field),
    singleDebit:true,
    writeOperationsEnabled:false
  };
}

export function simulateTaxPolicy(rows) {
  const events = rows.map(row => ({
    reference:String(row.external_ref ?? row.reference ?? ''),
    ...normalizeTaxCashEffect(row)
  }));
  const totalCashEffect = roundMoney(events.reduce((sum, event) => sum + event.cashEffect, 0));

  return {
    eventCount:events.length,
    events,
    totalCashEffect,
    absoluteTotal:roundMoney(Math.abs(totalCashEffect)),
    noDoubleCounting:events.every(event => event.singleDebit),
    writeOperationsEnabled:false
  };
}
