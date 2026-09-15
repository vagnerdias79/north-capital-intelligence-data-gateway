import { quote } from '../quotes.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { applyEntryStatesToUniverse } =
  require('../../lib/rebalancing/entry-state-enricher.js');

const DEFAULT_TICKERS = [
  'VOO','SCHD','QQQ','BRK-B','COST','V','SPGI','RELX','MSI','RACE',
  'MSFT','NVDA','MELI','RBRK','CIBR','PWR','DE','FCX','XOM','URA',
  'SHLD','ISRG','LLY','INTR'
];

export default async function handler(req, res) {
  try {
    const requested = String(req.query?.tickers || '')
      .split(',')
      .map(x => x.trim().toUpperCase())
      .filter(Boolean);

    const tickers = requested.length ? requested : DEFAULT_TICKERS;

    const quotes = await Promise.all(
      tickers.map(async ticker => {
        try {
          return await quote(ticker);
        } catch (error) {
          return {
            ticker,
            marketDataReady: false,
            error: String(error?.message || error)
          };
        }
      })
    );

    const universe = tickers.map(ticker => ({
      ticker
    }));

    /*
     * PRICE-ONLY MODE
     *
     * The homologated Entry Monitor requires a thesis-validity boolean.
     * This endpoint does NOT evaluate thesis. We therefore neutralize that
     * gate only for the purpose of calculating price behavior.
     *
     * The response explicitly marks thesis as NOT_EVALUATED and never
     * exposes the resulting state as an allocation authorization.
     */
    const enriched = applyEntryStatesToUniverse(universe, quotes, {
      thesisValidByTicker:
        Object.fromEntries(tickers.map(ticker => [ticker, true])),
      eventStateByTicker: {}
    });

    const states = enriched.map(asset => ({
      ticker: asset.ticker,
      priceActionState: asset.priceActionState || 'NORMAL',
      signalScope: 'PRICE_ONLY',
      thesisStatus: 'NOT_EVALUATED',
      decisionEligible: false
    }));

    res.status(200).json({
      ok: true,
      mode: 'READ_ONLY',
      writeOperationsEnabled: false,
      signalScope: 'PRICE_ONLY',
      thesisStatus: 'NOT_EVALUATED',
      decisionAuthorization: false,
      asOf: new Date().toISOString(),
      count: states.length,
      states
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mode: 'READ_ONLY',
      writeOperationsEnabled: false,
      error: String(error?.message || error)
    });
  }
}
