const UA = 'Mozilla/5.0 (compatible; NorthCapitalIntelligence/1.0)';
const MAP = {'BRK.B':'BRK-B'};
const STOOQ_MAP = {'BRK.B':'brk-b.us'};

function clean(s){ return String(s||'').trim().toUpperCase().replace(/[^A-Z0-9.^-]/g,''); }


function pctChange(current, base){
  const c = Number(current);
  const b = Number(base);
  if(!Number.isFinite(c) || !Number.isFinite(b) || b === 0) return null;
  return (c / b) - 1;
}

function average(values){
  const xs = values.filter(Number.isFinite);
  if(!xs.length) return null;
  return xs.reduce((a,b)=>a+b,0) / xs.length;
}

function sampleStdDev(values){
  const xs = values.filter(Number.isFinite);
  if(xs.length < 2) return null;
  const mean = average(xs);
  const variance =
    xs.reduce((sum,x)=>sum + ((x-mean) ** 2),0) / (xs.length - 1);
  return Math.sqrt(variance);
}

async function yahoo(ticker){
  const sym = MAP[ticker] || ticker;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=6mo&includePrePost=false`;
  const r = await fetch(url,{headers:{'User-Agent':UA,'Accept':'application/json'}});
  if(!r.ok) throw new Error(`Yahoo HTTP ${r.status}`);
  const j = await r.json();
  const res = j?.chart?.result?.[0];
  const meta = res?.meta || {};
  const quote = res?.indicators?.quote?.[0] || {};
  const timestamps = res?.timestamp || [];

  const regularSession =
    meta.currentTradingPeriod?.regular || {};

  const sessionStart =
    Number(regularSession.start);

  const sessionEnd =
    Number(regularSession.end);

  const regularMarketTime =
    Number(meta.regularMarketTime);

  const isIntradayPartial =
    Number.isFinite(sessionStart) &&
    Number.isFinite(sessionEnd) &&
    Number.isFinite(regularMarketTime) &&
    regularMarketTime >= sessionStart &&
    regularMarketTime < sessionEnd;

  const volumeState =
    isIntradayPartial
      ? 'INTRADAY_PARTIAL'
      : 'COMPLETE';

  const closesRaw = quote.close || [];
  const opensRaw = quote.open || [];
  const volumesRaw = quote.volume || [];

  // Preserva alinhamento entre close/open/volume/timestamp.
  const bars = timestamps.map((ts, i) => ({
    timestamp: Number(ts),
    close: Number(closesRaw[i]),
    open: Number(opensRaw[i]),
    volume: Number(volumesRaw[i]),
  })).filter(b => Number.isFinite(b.close) && b.close > 0);

  const closes = bars.map(b => b.close);
  const price = Number(meta.regularMarketPrice ?? closes.at(-1));

  if(!Number.isFinite(price) || price<=0) {
    throw new Error('Yahoo sem preço');
  }

  const last = bars.at(-1);
  const previous = bars.at(-2);

  const return1d =
    closes.length >= 2 ? pctChange(closes.at(-1), closes.at(-2)) : null;

  const return5d =
    closes.length >= 6 ? pctChange(closes.at(-1), closes.at(-6)) : null;

  const return20d =
    closes.length >= 21 ? pctChange(closes.at(-1), closes.at(-21)) : null;

  const return60d =
    closes.length >= 61 ? pctChange(closes.at(-1), closes.at(-61)) : null;

  const dailyReturns = [];
  for(let i=1; i<closes.length; i++){
    const r = pctChange(closes[i], closes[i-1]);
    if(Number.isFinite(r)) dailyReturns.push(r);
  }

  // Volatilidade diária, NÃO anualizada.
  const volatility20d =
    dailyReturns.length >= 20
      ? sampleStdDev(dailyReturns.slice(-20))
      : null;

  const gapPct =
    last &&
    previous &&
    Number.isFinite(last.open) &&
    previous.close > 0
      ? pctChange(last.open, previous.close)
      : null;

  const previousVolumes = bars
    .slice(-21, -1)
    .map(b => b.volume)
    .filter(v => Number.isFinite(v) && v >= 0);

  const avgVolume20d = average(previousVolumes);

  const volumeRatio =
    last &&
    Number.isFinite(last.volume) &&
    avgVolume20d &&
    avgVolume20d > 0
      ? last.volume / avgVolume20d
      : null;

  const sourceTimestamp =
    last && Number.isFinite(last.timestamp)
      ? new Date(last.timestamp * 1000).toISOString()
      : null;

  const marketDataReady = [
    return1d,
    return5d,
    return20d,
    return60d,
    volatility20d,
    gapPct,
    volumeRatio
  ].every(Number.isFinite);

  return {
    price,
    currency: meta.currency || 'USD',
    exchange: meta.exchangeName || meta.fullExchangeName || null,
    source: 'Yahoo',

    return1d,
    return5d,
    return20d,
    return60d,
    volatility20d,
    gapPct,
    volumeRatio,
    volumeState,

    sourceTimestamp,
    marketDataReady
  };
}

async function stooq(ticker){
  const sym = STOOQ_MAP[ticker] || `${ticker.toLowerCase().replace('.','-')}.us`;
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(sym)}&f=sd2t2ohlcv&h&e=csv`;
  const r = await fetch(url,{headers:{'User-Agent':UA,'Accept':'text/csv'}});
  if(!r.ok) throw new Error(`Stooq HTTP ${r.status}`);
  const txt = await r.text();
  const lines = txt.trim().split(/\r?\n/);
  if(lines.length<2) throw new Error('Stooq vazio');
  const row = lines[1].split(',');
  const close = Number(row[6]);
  if(!Number.isFinite(close)||close<=0) throw new Error('Stooq sem preço');
  return {price:close,currency:'USD',exchange:null,source:'Stooq'};
}

async function quote(ticker){
  try{return {ticker,ok:true,...await yahoo(ticker)}}
  catch(yahooError){
    try{return {ticker,ok:true,...await stooq(ticker),fallbackFrom:'Yahoo'}}
    catch(stooqError){return {ticker,ok:false,error:`Yahoo: ${yahooError.message}; Stooq: ${stooqError.message}`}}
  }
}

export { quote };

export default async function handler(req,res){
  res.setHeader('Cache-Control','s-maxage=30, stale-while-revalidate=120');
  const raw = String(req.query.symbols||'');
  const symbols = [...new Set(raw.split(',').map(clean).filter(Boolean))].slice(0,60);
  if(!symbols.length) return res.status(400).json({error:'symbols required'});
  const quotes = [];
  // Sequential batches avoid hammering public endpoints.
  for(let i=0;i<symbols.length;i+=8){
    const batch=symbols.slice(i,i+8);
    quotes.push(...await Promise.all(batch.map(quote)));
  }
  res.status(200).json({asOf:new Date().toISOString(),quotes});
}
