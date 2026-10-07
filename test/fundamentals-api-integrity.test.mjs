import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/fundamentals.js';

test('API preserves missing provider values and legitimate zeros',async()=>{
  const previousFetch=globalThis.fetch;
  const previousKey=process.env.ALPHA_VANTAGE_API_KEY;
  process.env.ALPHA_VANTAGE_API_KEY='test-only';
  globalThis.fetch=async()=>({ok:true,json:async()=>({
    Symbol:'LLY',LatestQuarter:'2026-06-30',Beta:null,
    QuarterlyRevenueGrowthYOY:'',QuarterlyEarningsGrowthYOY:'   ',
    ProfitMargin:'None',OperatingMarginTTM:'0',ReturnOnEquityTTM:0
  })});
  let payload;
  const res={setHeader(){},status(){return this;},json(value){payload=value;}};
  try{
    await handler({query:{symbols:'LLY'}},res);
    const data=payload.fundamentals[0].data;
    for(const field of ['beta','revenueGrowthYoY','earningsGrowthYoY','profitMargin','forwardPE']){
      assert.equal(data[field],null,field);
    }
    assert.equal(data.operatingMargin,0);
    assert.equal(data.returnOnEquity,0);
  }finally{
    globalThis.fetch=previousFetch;
    if(previousKey===undefined)delete process.env.ALPHA_VANTAGE_API_KEY;
    else process.env.ALPHA_VANTAGE_API_KEY=previousKey;
  }
});

for(const [message,type] of [['API call frequency exceeded per minute','FREQUENCY'],['Our standard API rate limit is 25 requests per day','DAILY_QUOTA'],['API rate limit reached','UNKNOWN'],['Please spread requests (1 request per second); lift the free key rate limit (25 requests per day)','FREQUENCY']]){
  test('Provider limit classification: '+type,async()=>{
    const oldFetch=globalThis.fetch,oldKey=process.env.ALPHA_VANTAGE_API_KEY;
    process.env.ALPHA_VANTAGE_API_KEY='test-only';
    let calls=0,payload,cacheHeader;
    globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({Information:message})}};
    const res={setHeader(k,v){cacheHeader=v},status(){return this},json(v){payload=v}};
    try{
      await handler({query:{symbols:'MSFT,NVDA'}},res);
      assert.equal(calls,1);
      assert.equal(payload.providerLimit.type,type);
      assert.equal(payload.providerLimit.message,message);
      assert.ok(Date.parse(payload.providerLimit.retryAt)>Date.now());
      assert.equal(payload.fundamentals[1].deferred,true);
      assert.equal(cacheHeader,'no-store, max-age=0');
    }finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.ALPHA_VANTAGE_API_KEY;else process.env.ALPHA_VANTAGE_API_KEY=oldKey}
  });
}

 test('premium access restriction is not a temporary rate limit',async()=>{
 const oldFetch=globalThis.fetch,oldKey=process.env.ALPHA_VANTAGE_API_KEY;
 process.env.ALPHA_VANTAGE_API_KEY='test-only';let payload;
 globalThis.fetch=async()=>({ok:true,json:async()=>({Information:'This is a premium endpoint. Subscribe to premium plans to remove rate limits.'})});
 try{await handler({query:{symbols:'MSFT'}},{setHeader(){},status(){return this},json(v){payload=v}});
 assert.equal(payload.rateLimited,false);assert.equal(payload.providerLimit,null);assert.equal(payload.fundamentals[0].accessDenied,true);assert.equal(payload.fundamentals[0].ok,false);
 }finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.ALPHA_VANTAGE_API_KEY;else process.env.ALPHA_VANTAGE_API_KEY=oldKey}
 });
