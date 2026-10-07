import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const ctx={};vm.runInNewContext(readFileSync(new URL('../assets/opportunity-policy.js',import.meta.url),'utf8'),ctx);
const policy=ctx.NCIOpportunityPolicy;
const portfolio=[{ticker:'INTR',qty:1,price:100},{ticker:'TFLO',qty:1,price:400},{ticker:'FCX',category:'Opportunity / Structural',qty:1,price:500}];
test('cash belongs in USD aggregate and structural opportunity is excluded',()=>{
 const s=policy.evaluate(portfolio);assert.equal(s.count,1);assert.equal(s.weight,.1);assert.equal(s.remaining,50);
 assert.equal(policy.evaluate(portfolio,100).remaining,65);
});
test('aggregate headroom is shared and third simultaneous position is blocked',()=>{
 const rows=[{ticker:'B',allocationMode:'TACTICAL_OPPORTUNITY',amount:30},{ticker:'C',allocationMode:'TACTICAL_OPPORTUNITY',amount:30},{ticker:'INTR',amount:30}];
 policy.constrain(rows,portfolio);assert.equal(rows[0].amount,30);assert.equal(rows[1].amount,0);assert.equal(rows[2].amount,20);
});
test('price absence blocks tactical suggestions and excess never produces a sale',()=>{
 const rows=[{ticker:'INTR',amount:10}];policy.constrain(rows,[...portfolio,{ticker:'A',qty:1,price:null}]);assert.equal(rows[0].amount,0);
 const over=[{ticker:'INTR',qty:1,price:200},{ticker:'TFLO',qty:1,price:800}];
 assert.equal(policy.evaluate(over).remaining,0);assert.equal(over[0].qty,1);
});
test('cent rounding cannot exceed aggregate headroom',()=>{
 const rows=[{ticker:'INTR',amount:100}];policy.constrain(rows,[{ticker:'INTR',qty:1,price:1},{ticker:'TFLO',qty:1,price:9.01}]);assert.equal(rows[0].amount,.5);
});
test('already exceeding position count blocks new capital even in a held name',()=>{
 const positions=[...portfolio,{ticker:'B',allocationMode:'TACTICAL_OPPORTUNITY',qty:1,price:1},{ticker:'C',allocationMode:'TACTICAL_OPPORTUNITY',qty:1,price:1}];
 const rows=[{ticker:'INTR',amount:10}];policy.constrain(rows,positions);assert.equal(rows[0].amount,0);
});
