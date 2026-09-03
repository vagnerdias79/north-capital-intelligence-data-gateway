const UA='NorthCapitalIntelligence/1.0';
const MIN_INTERVAL_MS=1250;
function clean(s){ return String(s||'').trim().toUpperCase().replace(/[^A-Z0-9.^-]/g,''); }
function num(v){ const n=Number(v); return Number.isFinite(n)?n:null; }
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function overview(ticker,key){
  const symbol=ticker==='BRK.B'?'BRK-B':ticker;
  const url=`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`;
  const r=await fetch(url,{headers:{'User-Agent':UA,'Accept':'application/json'}});
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  const d=await r.json();
  if(d.Note||d.Information||!d.Symbol)throw new Error(d.Note||d.Information||'overview unavailable');
  return {
    marketCap:num(d.MarketCapitalization),
    revenueTTM:num(d.RevenueTTM),
    grossProfitTTM:num(d.GrossProfitTTM),
    ebitda:num(d.EBITDA),
    eps:num(d.EPS),
    pe:num(d.PERatio),
    forwardPE:num(d.ForwardPE),
    peg:num(d.PEGRatio),
    priceToSales:num(d.PriceToSalesRatioTTM),
    priceToBook:num(d.PriceToBookRatio),
    profitMargin:num(d.ProfitMargin),
    operatingMargin:num(d.OperatingMarginTTM),
    returnOnEquity:num(d.ReturnOnEquityTTM),
    revenueGrowthYoY:num(d.QuarterlyRevenueGrowthYOY),
    earningsGrowthYoY:num(d.QuarterlyEarningsGrowthYOY),
    analystTargetPrice:num(d.AnalystTargetPrice),
    beta:num(d.Beta),
    week52High:num(d['52WeekHigh']),
    week52Low:num(d['52WeekLow'])
  };
}

export default async function handler(req,res){
  const key=process.env.ALPHA_VANTAGE_API_KEY;
  const symbols=[...new Set(String(req.query.symbols||'').split(',').map(clean).filter(Boolean))].slice(0,20);
  const asOf=new Date().toISOString();

  if(!symbols.length)return res.status(400).json({error:'symbols required'});
  if(!key)return res.status(200).json({configured:false,source:'Alpha Vantage',asOf,fundamentals:[]});

  const fundamentals=[];
  let rateLimited=false;

  for(let i=0;i<symbols.length;i++){
    const ticker=symbols[i];
    try{
      const data=await overview(ticker,key);
      fundamentals.push({ticker,ok:true,source:'Alpha Vantage',data});
    }catch(e){
      const msg=String(e?.message||e);
      const isRate=/frequency|rate|limit|requests per second|API call/i.test(msg);
      fundamentals.push({ticker,ok:false,source:'Alpha Vantage',rateLimited:isRate,error:msg});
      if(isRate){ rateLimited=true; break; }
    }
    if(i<symbols.length-1) await sleep(MIN_INTERVAL_MS);
  }

  if(rateLimited && fundamentals.length<symbols.length){
    const attempted=new Set(fundamentals.map(x=>x.ticker));
    for(const ticker of symbols){
      if(!attempted.has(ticker)){
        fundamentals.push({
          ticker,ok:false,source:'Alpha Vantage',
          rateLimited:true,deferred:true,
          error:'Deferred after provider rate limit; retry later.'
        });
      }
    }
  }

  res.setHeader('Cache-Control','s-maxage=86400, stale-while-revalidate=604800');
  res.status(200).json({
    configured:true,
    source:'Alpha Vantage',
    asOf,
    minIntervalMs:MIN_INTERVAL_MS,
    rateLimited,
    fundamentals
  });
}
