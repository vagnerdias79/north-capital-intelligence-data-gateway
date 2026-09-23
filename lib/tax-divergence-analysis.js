function numberOrZero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function canonicalLedgerRef(value) {
  return String(value ?? '').replace(/^NCI-BASELINE:/, '');
}

export function analyzeTaxRows(rows, expectedFingerprint) {
  const originals = rows.filter(row =>
    row.transaction_type === 'TAX'
    && row.ledger_fingerprint === expectedFingerprint
    && !String(row.external_ref ?? '').startsWith('NCI-BASELINE:'));
  const baselines = rows.filter(row =>
    row.transaction_type === 'TAX'
    && row.ledger_fingerprint === expectedFingerprint
    && String(row.external_ref ?? '').startsWith('NCI-BASELINE:'));
  const originalByRef = new Map(originals.map(row => [canonicalLedgerRef(row.external_ref), row]));

  const pairs = [];
  const unmatchedBaselines = [];
  for (const baseline of baselines) {
    const ref = canonicalLedgerRef(baseline.external_ref);
    const original = originalByRef.get(ref);
    if (!original) {
      unmatchedBaselines.push(baseline.id);
      continue;
    }
    originalByRef.delete(ref);

    const originalGross = numberOrZero(original.gross_amount);
    const baselineGross = numberOrZero(baseline.gross_amount);
    const originalTax = numberOrZero(original.tax_amount);
    const baselineTax = numberOrZero(baseline.tax_amount);
    const classification = originalGross === 0 && baselineGross < 0
      ? 'VALUE_PLACEMENT_REVIEW'
      : originalGross === -baselineGross
        ? 'SIGN_REVIEW'
        : 'FINANCIAL_REVIEW';

    pairs.push({
      reference:ref,
      tradeDate:original.trade_date,
      ticker:original.ticker,
      classification,
      original:{
        grossAmount:originalGross,
        taxAmount:originalTax,
        feeAmount:numberOrZero(original.fee_amount),
        notes:original.notes ?? null,
        metadata:original.metadata ?? null
      },
      baseline:{
        grossAmount:baselineGross,
        taxAmount:baselineTax,
        feeAmount:numberOrZero(baseline.fee_amount),
        notes:baseline.notes ?? null,
        metadata:baseline.metadata ?? null
      },
      grossDifference:Number((baselineGross - originalGross).toFixed(8))
    });
  }

  const absoluteGrossDifference = Number(pairs.reduce(
    (sum, pair) => sum + Math.abs(pair.grossDifference), 0
  ).toFixed(8));

  return {
    originals:originals.length,
    baselines:baselines.length,
    pairs,
    unmatchedOriginals:[...originalByRef.values()].map(row => row.id),
    unmatchedBaselines,
    absoluteGrossDifference
  };
}
