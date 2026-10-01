import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const panel=html.slice(html.indexOf('<article class="nci-panel nci-executive">'),html.indexOf('</article>',html.indexOf('<article class="nci-panel nci-executive">')));
test('dashboard summary contains quote provenance without unsupported ratings or audit claims',()=>{
 assert.doesNotMatch(panel,/AUDITADO|North Score|STRONG|Policy:|Prioridades:|fundamentos sincronizados/);
 assert.doesNotMatch(html,/northScore:82/);
 assert.match(panel,/marketState.dated/);
 assert.match(panel,/marketState.total/);
 assert.match(panel,/marketState.stamp/);
 assert.match(panel,/marketState.fresh/);
});
