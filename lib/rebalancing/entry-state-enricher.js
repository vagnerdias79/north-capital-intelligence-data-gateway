'use strict';

const {
  quoteToMarketSnapshot
} = require('./market-data-adapter');

const {
  evaluateEntryMonitorFromSnapshot
} = require('./entry-monitor');

function normalizeTicker(ticker) {
  return String(ticker || '')
    .trim()
    .toUpperCase()
    .replace('BRK.B', 'BRK-B');
}

function applyEntryStatesToUniverse(
  universe = [],
  quotes = [],
  {
    asOf = null,
    eventStateByTicker = {},
    thesisValidByTicker = {}
  } = {}
) {
  const quoteMap = new Map(
    quotes.map(q => [
      normalizeTicker(q.ticker),
      q
    ])
  );

  return universe.map(asset => {
    const ticker = normalizeTicker(asset.ticker);
    const quote = quoteMap.get(ticker);

    if (!quote) {
      throw new Error(`MISSING_MARKET_QUOTE:${ticker}`);
    }

    const snapshot = quoteToMarketSnapshot(quote, {
      asOf,
      eventState:
        eventStateByTicker[ticker] || 'NONE',
      thesisValid:
        thesisValidByTicker[ticker] !== false
    });

    const entry =
      evaluateEntryMonitorFromSnapshot(snapshot);

    return {
      ...asset,
      priceActionState: entry.state
    };
  });
}

module.exports = {
  applyEntryStatesToUniverse
};
