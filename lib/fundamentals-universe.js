// Read-only planning: no requests, persistence, scores or investment decisions.
export function planFundamentals({positions = [], radar = [], cachedRows = [], isEligible = () => false} = {}) {
  const assets = new Map();
  const separateReview = [];
  for (const [scope, rows] of [['RADAR', radar], ['PORTFOLIO', positions]]) {
    for (const asset of rows) {
      const ticker = String(asset?.ticker || '').trim().toUpperCase();
      if (!ticker) continue;
      const assetClass = String(asset.assetClass || asset.type || '').toUpperCase();
      if (scope === 'PORTFOLIO' && assetClass !== 'STOCK') {
        separateReview.push({ticker, assetClass, status: 'REQUIRES_INSTRUMENT_REVIEW'});
        continue;
      }
      if (!assets.has(ticker)) assets.set(ticker, {ticker, scopes: []});
      const entry = assets.get(ticker);
      if (!entry.scopes.includes(scope)) entry.scopes.push(scope);
    }
  }
  const cached = new Map();
  for (const row of cachedRows) {
    const ticker = String(row?.ticker || '').trim().toUpperCase();
    if (assets.has(ticker) && row?.ok === true && isEligible(row)) cached.set(ticker, row);
  }
  return {
    assets: [...assets.values()],
    cached: [...cached.values()],
    pending: [...assets.keys()].filter(ticker => !cached.has(ticker)),
    separateReview,
    writeOperationsEnabled: false,
    decisionStatus: 'REVIEW_PENDING'
  };
}
