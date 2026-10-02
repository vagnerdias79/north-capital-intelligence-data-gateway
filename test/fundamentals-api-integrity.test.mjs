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
