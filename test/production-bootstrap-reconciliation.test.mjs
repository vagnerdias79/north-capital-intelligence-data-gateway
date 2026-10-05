import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');

const scheduler=html.slice(html.indexOf(' function scheduleAutomaticRefresh('),html.indexOf(' window.NCI_BUY_SCORE='));

for(const [label,state] of [
  ['clean',null],['fresh',{at:new Date().toISOString()}],
  ['stale',{at:'2020-01-01T00:00:00Z'}],['invalid',{at:'invalid'}]
]){
  for(const readyState of ['loading','complete']){
    test(`opening ${label} session while ${readyState} runs the manual refresh once`,()=>{
      let runs=0;
      const pending=[];
      runInNewContext(scheduler+'scheduleAutomaticRefresh(state);',{
        state,run:()=>{runs++},
        window:{NCI_FULL_UPDATE:{running:false}},
        setInterval(callback,delay){assert.equal(delay,15*60*1000);},
        document:{readyState,addEventListener(event,callback,options){
          assert.equal(event,'DOMContentLoaded');assert.equal(options.once,true);pending.push(callback);
        }},queueMicrotask:callback=>pending.push(callback)
      });
      assert.equal(runs,0);
      assert.equal(pending.length,1);
      pending[0]();
      assert.equal(runs,1);
    });
  }
}

test('TAX source updates retain status without inserting a row into the fixed dashboard grid',()=>{
  const runtime=html.split('id="nci-tax-dashboard-preview-v2-6-runtime"')[1].split('</script>')[0];
  assert.match(runtime,/taxCashEffect:a.selectedTotal/);
  assert.match(runtime,/setPill\('nci-tax-ok','TAX Dashboard '/);
  assert.doesNotMatch(runtime,/root\.prepend|decorate\(result\)/);
});

test('reconciles the frozen position anchor instead of post-baseline operations',()=>{
  assert.match(html,/function localBaselinePortfolio\(\)/);
  assert.match(html,/Array\.isArray\(state\?\.positionAnchor\)\?state\.positionAnchor:\[\]/);
  assert.match(html,/function localOperationalPortfolio\(\)/);
  assert.match(html,/const localRows=localBaselinePortfolio\(\)/);
  assert.match(html,/postBaselineOperations:true/);
  assert.doesNotMatch(html,/function localPortfolio\(\)/);
});

 test('automatic refresh repeats every 15 minutes and skips overlapping runs',()=>{
   let runs=0,tick;
   const state={running:false};
   runInNewContext(scheduler+'scheduleAutomaticRefresh(null);',{
     run:()=>{runs++},window:{NCI_FULL_UPDATE:state},
     document:{readyState:'complete'},queueMicrotask:callback=>callback(),
     setInterval(callback,delay){assert.equal(delay,900000);tick=callback;}
   });
   assert.equal(runs,1);
   tick();assert.equal(runs,2);
   state.running=true;tick();assert.equal(runs,2);
   state.running=false;tick();assert.equal(runs,3);
 });
