import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('<article class="nci-panel nci-executive">');
const panel=html.slice(start,html.indexOf('</article>',start));
const fn=html.slice(html.indexOf('  function concentrationSummary('),html.indexOf(' function render(){',html.indexOf('  function concentrationSummary(')));
const summary=vm.runInNewContext(fn+';concentrationSummary');
test('dashboard concentration excludes cash from weights and exempts ETFs from stock cap',()=>{
 const result=summary([{ticker:'A',type:'Stock',qty:1,price:11},{ticker:'ETF',type:'ETF',qty:1,price:89},{ticker:'TFLO',type:'Cash',qty:1,price:100}]);
 assert.equal(result.valid,true);assert.equal(result.base,100);assert.equal(result.cash,100);
 assert.equal(result.breaches.length,1);assert.equal(result.breaches[0].ticker,'A');assert.equal(result.stocks[0].weight,.11);
 assert.equal(summary([{ticker:'A',type:'Stock',qty:1,price:10},{ticker:'ETF',type:'ETF',qty:1,price:90}]).breaches.length,0);
});
test('dashboard concentration fails closed for incomplete prices or empty portfolio',()=>{
 assert.equal(summary([]).valid,false);
 assert.equal(summary([{ticker:'A',type:'Stock',qty:1,price:null}]).valid,false);
});
test('dashboard panel contains computed concentration without unsupported ratings',()=>{
 assert.doesNotMatch(panel,/AUDITADO|North Score|STRONG|fundamentos sincronizados/);
 assert.doesNotMatch(html,/northScore:82/);
 assert.match(panel,/concentration.valid/);assert.match(panel,/concentration.breaches/);
 assert.match(panel,/ETFs isentos/);assert.match(panel,/excluindo TFLO/);
});
