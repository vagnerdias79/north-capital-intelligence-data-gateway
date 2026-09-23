export const comparableFields = Object.freeze([
  'transaction_type', 'trade_date', 'settlement_date', 'ticker', 'quantity',
  'unit_price', 'gross_amount', 'fee_amount', 'tax_amount', 'currency',
  'fx_rate', 'external_ref', 'source', 'notes'
]);

export function isLedgerBaseline(row, expectedFingerprint) {
  return row.ledger_fingerprint === expectedFingerprint
    && String(row.external_ref ?? '').startsWith('NCI-BASELINE:');
}

export function classifyLedgerRows(rows, expectedFingerprint) {
  const baselines = [];
  const originals = [];

  for (const row of rows) {
    (isLedgerBaseline(row, expectedFingerprint) ? baselines : originals).push(row);
  }

  return { originals, baselines };
}

function scalar(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    return Number(value);
  }
  return String(value).trim();
}

function same(a, b) {
  const left = scalar(a);
  const right = scalar(b);
  if (typeof left === 'number' && typeof right === 'number') {
    return Math.abs(left - right) <= 1e-8;
  }
  return left === right;
}

function canonicalExternalRef(value) {
  const ref = scalar(value);
  return typeof ref === 'string' ? ref.replace(/^NCI-BASELINE:/, '') : ref;
}

function pairKey(row) {
  const externalRef = canonicalExternalRef(row.external_ref);
  if (externalRef) return `external_ref|${externalRef}`;

  return [row.trade_date, row.transaction_type, row.ticker]
    .map(value => scalar(value) ?? '')
    .join('|');
}

export function differences(original, baseline) {
  return comparableFields.flatMap(field => {
    const matches = field === 'external_ref'
      ? same(canonicalExternalRef(original[field]), canonicalExternalRef(baseline[field]))
      : same(original[field], baseline[field]);
    return matches
      ? []
      : [{ field, original: scalar(original[field]), baseline: scalar(baseline[field]) }];
  });
}

export function reconcile(originals, baselines) {
  const queues = new Map();
  for (const row of originals) {
    const key = pairKey(row);
    const queue = queues.get(key) || [];
    queue.push(row);
    queues.set(key, queue);
  }

  const pairs = [];
  const unmatchedBaselines = [];
  for (const baseline of baselines) {
    const queue = queues.get(pairKey(baseline)) || [];
    const original = queue.shift() || null;
    if (!original) {
      unmatchedBaselines.push(baseline.id);
      continue;
    }
    const fields = differences(original, baseline);
    pairs.push({
      originalId: original.id,
      baselineId: baseline.id,
      key: pairKey(baseline),
      status: fields.length ? 'DIVERGENT' : 'MATCH',
      differences: fields
    });
  }

  const unmatchedOriginals = [...queues.values()].flat().map(row => row.id);
  return { pairs, unmatchedOriginals, unmatchedBaselines };
}
