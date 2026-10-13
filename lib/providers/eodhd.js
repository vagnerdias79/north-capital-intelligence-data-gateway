import { normalize, symbolFor } from '../../assets/eodhd-normalize.js';
export { normalize, symbolFor, metricPaths } from '../../assets/eodhd-normalize.js';
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
