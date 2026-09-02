const UA = 'Mozilla/5.0 (compatible; NorthCapitalIntelligence/1.0)';
const MAP = {'BRK.B':'BRK-B'};
const STOOQ_MAP = {'BRK.B':'brk-b.us'};

function clean(s){ return String(s||'').trim().toUpperCase().replace(/[^A-Z0-9.^-]/g,''); }

async function yahoo(ticker){
  const sym = MAP[ticker] || ticker;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d&includePrePost=false`;
  const r = await fetch(url,{headers:{'User-Agent':UA,'Accept':'application/json'}});
  if(!r.ok) throw new Error(`Yahoo HTTP ${r.status}`);
  const j = await r.json();
  const res = j?.chart?.result?.[0];
  const meta = res?.meta || {};
  const closes = res?.indicators?.quote?.[0]?.close?.filter(Number.isFinite) || [];
  const price = Number(meta.regularMarketPrice ?? closes.at(-1));
  if(!Number.isFinite(price) || price<=0) throw new Error('Yahoo sem preço');
  return {price, currency:meta.currency||'USD', exchange:meta.exchangeName||meta.fullExchangeName||null, source:'Yahoo'};
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
