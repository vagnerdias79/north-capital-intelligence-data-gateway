const UA='NorthCapitalIntelligence/1.0';
function clean(s){ return String(s||'').trim().toUpperCase().replace(/[^A-Z0-9.^-]/g,''); }
function num(v){ const n=Number(v); return Number.isFinite(n)?n:null; }

async function overview(ticker,key){
  const symbol=ticker==='BRK.B'?'BRK-B':ticker;
  const url=`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`;
  const r=await fetch(url,{headers:{'User-Agent':UA,'Accept':'application/json'}});
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  const d=await r.json();
  if(d.Note||d.Information||!d.Symbol)throw new Error(d.Note||d.Information||'overview unavailable');
  return {
    marketCap:num(d.MarketCapitalization), revenueTTM:num(d.RevenueTTM),
    grossProfitTTM:num(d.GrossProfitTTM), ebitda:num(d.EBITDA), eps:num(d.EPS),
    pe:num(d.PERatio), forwardPE:num(d.ForwardPE), peg:num(d.PEGRatio),
    priceToSales:num(d.PriceToSalesRatioTTM), priceToBook:num(d.PriceToBookRatio),
    profitMargin:num(d.ProfitMargin), operatingMargin:num(d.OperatingMarginTTM),
    returnOnEquity:num(d.ReturnOnEquityTTM), revenueGrowthYoY:num(d.QuarterlyRevenueGrowthYOY),
    earningsGrowthYoY:num(d.QuarterlyEarningsGrowthYOY), analystTargetPrice:num(d.AnalystTargetPrice),
    beta:num(d.Beta), week52High:num(d['52WeekHigh']), week52Low:num(d['52WeekLow'])
  };
}

export default async function handler(req,res){
  const key=process.env.ALPHA_VANTAGE_API_KEY;
  const symbols=[...new Set(String(req.query.symbols||'').split(',').map(clean).filter(Boolean))].slice(0,20);
  if(!symbols.length)return res.status(400).json({error:'symbols required'});
  if(!key)return res.status(200).json({configured:false,source:'Alpha Vantage',asOf:new Date().toISOString(),fundamentals:[]});
  const fundamentals=[];
  // Sequential by design because the free API is rate-limited.
  for(const ticker of symbols){
    try{fundamentals.push({ticker,ok:true,source:'Alpha Vantage',data:await overview(ticker,key)})}
    catch(e){
      fundamentals.push({ticker,ok:false,source:'Alpha Vantage',error:String(e?.message||e)});
      if(/frequency|rate|limit|API call/i.test(String(e?.message||e)))break;
    }
  }
  res.setHeader('Cache-Control','s-maxage=900, stale-while-revalidate=3600');
  res.status(200).json({configured:true,source:'Alpha Vantage',asOf:new Date().toISOString(),fundamentals});
}
