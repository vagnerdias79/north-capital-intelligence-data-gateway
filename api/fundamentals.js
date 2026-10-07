import { createHandler } from '../lib/providers/eodhd-handler.js';
const eodhdHandler=createHandler({authenticate:async req=>{
  const { requireNeonIdentity }=await import('../lib/auth-jwt.js');
  return requireNeonIdentity(req);
}});
const UA='NorthCapitalIntelligence/1.0';
const MIN_INTERVAL_MS=1250;
function clean(s){ return String(s||'').trim().toUpperCase().replace(/[^A-Z0-9.^-]/g,''); }
function num(v){
  if(v===null||v===undefined||(typeof v==='string'&&v.trim()===''))return null;
  const n=Number(v); return Number.isFinite(n)?n:null;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function overview(ticker,key){
  const symbol=ticker==='BRK.B'?'BRK-B':ticker;
  const url=`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`;
  const r=await fetch(url,{headers:{'User-Agent':UA,'Accept':'application/json'}});
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  const d=await r.json();
  if(d.Note||d.Information||!d.Symbol)throw new Error(d.Note||d.Information||'overview unavailable');
  return {data:{
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
  },sourcePeriodEnd:d.LatestQuarter||null,currency:d.Currency||null,country:d.Country||null,exchange:d.Exchange||null};
}

export default async function handler(req,res){
  if(req.query?.provider==='eodhd')return eodhdHandler(req,res);
  const key=process.env.ALPHA_VANTAGE_API_KEY;
  const symbols=[...new Set(String(req.query.symbols||'').split(',').map(clean).filter(Boolean))].slice(0,20);
  const asOf=new Date().toISOString();

  if(!symbols.length)return res.status(400).json({error:'symbols required'});
  if(!key)return res.status(200).json({configured:false,source:'Alpha Vantage',asOf,fundamentals:[]});

  const fundamentals=[];
  let rateLimited=false;
  let providerLimit=null;
  let accessRestricted=false;

  for(let i=0;i<symbols.length;i++){
    const ticker=symbols[i];
    try{
      const overviewResult=await overview(ticker,key);
      fundamentals.push({
        ticker,ok:true,source:'Alpha Vantage',data:overviewResult.data,
        provenance:{
          schemaVersion:'NCI_FUNDAMENTALS_PROVENANCE_V1',
          provider:'Alpha Vantage',dataset:'OVERVIEW',retrievedAt:asOf,
          sourcePeriodEnd:overviewResult.sourcePeriodEnd,
          currency:overviewResult.currency,country:overviewResult.country,exchange:overviewResult.exchange,
          sourcePublishedAt:null,sourceUrlType:'provider-api'
        }
      });
    }catch(e){
      const msg=String(e?.message||e);
      const accessDenied=/premium endpoint|premium-only|invalid api key|invalid apikey/i.test(msg);
      const isRate=!accessDenied&&/frequency|rate|limit|requests per second|API call/i.test(msg);
      fundamentals.push({ticker,ok:false,source:'Alpha Vantage',rateLimited:isRate,accessDenied,error:msg});
      if(accessDenied){accessRestricted=true;break;}
      if(isRate){
        rateLimited=true;
        const mentionsDaily=/per day|daily|a day/i.test(msg);
        const frequency=/per second|per minute|frequency|per-second/i.test(msg);
        const daily=mentionsDaily&&!frequency;
        const retryAfterSeconds=daily?86400:frequency?60:300;
        providerLimit={type:daily?'DAILY_QUOTA':frequency?'FREQUENCY':'UNKNOWN',message:msg,retryAfterSeconds,retryAt:new Date(Date.now()+retryAfterSeconds*1000).toISOString(),retryPolicy:'CONSERVATIVE_BACKOFF'};
        break;
      }
    }
    if(i<symbols.length-1) await sleep(MIN_INTERVAL_MS);
  }

  if((rateLimited||accessRestricted) && fundamentals.length<symbols.length){
    const attempted=new Set(fundamentals.map(x=>x.ticker));
    for(const ticker of symbols){
      if(!attempted.has(ticker)){
        fundamentals.push({
          ticker,ok:false,source:'Alpha Vantage',
          rateLimited:rateLimited,accessDenied:accessRestricted,deferred:true,
          error:accessRestricted?'Deferred after provider access restriction; review provider plan or credentials.':'Deferred after provider rate limit; retry later.'
        });
      }
    }
  }

  const complete=fundamentals.length===symbols.length&&fundamentals.every(row=>row.ok);
  // Provider errors and partial payloads must never become a 24-hour CDN truth.
  res.setHeader('Cache-Control',complete
    ?'s-maxage=86400, stale-while-revalidate=604800'
    :'no-store, max-age=0');
  res.status(200).json({
    configured:true,
    source:'Alpha Vantage',
    asOf,
    provenancePolicy:{schemaVersion:'NCI_FUNDAMENTALS_PROVENANCE_V1',maxRetrievalAgeHours:36,maxReportedPeriodAgeDays:200},
    minIntervalMs:MIN_INTERVAL_MS,
    rateLimited,
    providerLimit,
    accessDenied:accessRestricted,
    complete,
    fundamentals
  });
}

