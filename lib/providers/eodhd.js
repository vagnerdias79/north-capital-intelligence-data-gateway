// Preparation only: does not authorize scores, trades or portfolio writes.
export const metricPaths = Object.freeze({
  profitMargin:'Highlights.ProfitMargin', operatingMargin:'Highlights.OperatingMarginTTM',
  returnOnEquity:'Highlights.ReturnOnEquityTTM', revenueGrowthYoY:'Highlights.QuarterlyRevenueGrowthYOY',
  earningsGrowthYoY:'Highlights.QuarterlyEarningsGrowthYOY', forwardPE:'Valuation.ForwardPE',
  peg:'Highlights.PEGRatio', priceToSales:'Valuation.PriceSalesTTM', analystTargetPrice:'AnalystRatings.TargetPrice'
});
const universe = new Set('BRK.B RACE COST NVDA MSFT MELI PWR V XOM SPGI DE FCX INTR RELX MSI LLY ANET VRT AXON GEV ZS PANW FTNT CRWD CHKP NET'.split(' '));
export function symbolFor(ticker) {
  const value=String(ticker||'').trim().toUpperCase();
  const canonical=value==='BRK-B'?'BRK.B':value;
  if(!universe.has(canonical)) throw Object.assign(new Error('Unsupported NCI equity'),{code:'UNSUPPORTED_SYMBOL'});
  return `${canonical==='BRK.B'?'BRK-B':canonical}.US`;
}
function number(value) {
  if(value==null || typeof value==='boolean' || (typeof value==='string'&&!value.trim()))return null;
  if(!['number','string'].includes(typeof value))return null;
  const result=Number(value);return Number.isFinite(result)?result:null;
}
function date(value) {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const parsed=Date.parse(value);return Number.isFinite(parsed)&&new Date(parsed).toISOString().slice(0,10)===value?value:null;
}
export function normalize(ticker,raw,{retrievedAt=new Date().toISOString(),sample=false}={}) {
  const symbol=symbolFor(ticker), expected=symbol.slice(0,-3);
  if(raw?.General?.Code!==expected || !['NYSE','NASDAQ','NYSE ARCA','AMEX'].includes(raw?.General?.Exchange))
    throw Object.assign(new Error('Provider instrument identity mismatch'),{code:'INSTRUMENT_MISMATCH'});
  const now=Date.parse(retrievedAt);
  if(!Number.isFinite(now))throw new Error('Invalid retrieval date');
  const data=Object.fromEntries(Object.entries(metricPaths).map(([field,path])=>{
    const value=path.split('.').reduce((obj,key)=>obj?.[key],raw);
    return [field,number(value)];
  }));
  // Keep ratios in native decimal units. Presentation converts them to percent.
  for(const field of ['forwardPE','peg','priceToSales','analystTargetPrice'])if(data[field]!==null&&data[field]<=0)data[field]=null;
  const statements=raw.Financials?.Income_Statement;
  const history=Object.values(raw.Earnings?.History||{});
  const published=Object.values(statements?.quarterly||{}).filter(row=>{
    const end=date(row?.date), filing=date(row?.filing_date);
    return end&&filing&&Date.parse(end)<=now&&Date.parse(filing)<=now&&number(row.netIncome)!==null&&number(row.totalRevenue)!==null;
  }).sort((a,b)=>b.date.localeCompare(a.date));
  const latest=published[0]||null;
  const earnings=latest?history.find(row=>row.date===latest.date&&number(row.epsActual)!==null&&date(row.reportDate)&&Date.parse(row.reportDate)<=now):null;
  const missingMetrics=Object.keys(metricPaths).filter(field=>data[field]===null);
  return {
    ticker:expected==='BRK-B'?'BRK.B':expected,ok:true,source:'EODHD',data,
    validation:{mode:sample?'SAMPLE_ONLY':'PROVIDER_PAYLOAD',missingMetrics,decisionAuthorization:false},
    provenance:{schemaVersion:'NCI_FUNDAMENTALS_PROVENANCE_V1',provider:'EODHD',dataset:'FUNDAMENTALS',
      retrievedAt:new Date(now).toISOString(),sourcePeriodEnd:latest?.date||null,
      sourcePublishedAt:earnings?.reportDate||latest?.filing_date||null,filingDate:latest?.filing_date||null,
      providerUpdatedAt:date(raw.General.UpdatedAt),currency:raw.General.CurrencyCode||null,
      reportingCurrency:latest?.currency_symbol||statements?.currency_symbol||null,
      country:raw.General.CountryName||null,exchange:raw.General.Exchange,sourceUrlType:'provider-api',
      sampleOnly:sample,estimatedFields:['forwardPE','peg','analystTargetPrice'],adrRatio:null},
    writeOperationsEnabled:false
  };
}
export async function fetchFundamentals(ticker,key,{fetchImpl=fetch,retrievedAt=new Date().toISOString()}={}) {
  const symbol=symbolFor(ticker);
  const url=new URL(`https://eodhd.com/api/fundamentals/${symbol}`);
  // Original endpoint matches supplied samples; version upgrade requires separate mapping validation.
  url.searchParams.set('api_token',key);url.searchParams.set('fmt','json');
  const response=await fetchImpl(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000),redirect:'error'});
  if(!response.ok){
    const code=[401,402,403].includes(response.status)?'PROVIDER_ACCESS_DENIED':response.status===429?'PROVIDER_RATE_LIMIT':'PROVIDER_UNAVAILABLE';
    throw Object.assign(new Error(code),{code,httpStatus:response.status});
  }
  // Do not return raw provider errors or URLs containing credentials.
  let raw;try{raw=await response.json();}catch{throw Object.assign(new Error('Invalid provider JSON'),{code:'PROVIDER_INVALID_PAYLOAD'});}
  return normalize(ticker,raw,{retrievedAt});
}
