import { db } from '../../lib/db.js';
import { json, methodNotAllowed } from '../../lib/http.js';
import { requireNeonIdentity } from '../../lib/auth-jwt.js';
import { compareTaxShadowRows } from '../../lib/tax-shadow-comparison.js';

const EXPECTED = Object.freeze({
  fingerprint:'NCI-LEDGER-AEF25E9D3A64',
  eventCount:9,
  total:-0.54
});

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  try {
    const identity = await requireNeonIdentity(req);
    const sql = db();
    const users = await sql`
      select id from app_users where auth_subject = ${identity.subject} limit 1
    `;
    const user = users?.[0] || null;
    if (!user) return json(res, 403, { ok:false, error:'IDENTITY_NOT_LINKED' });

    const portfolios = await sql`
      select id, code, status, baseline_version
      from portfolios
      where user_id = ${user.id} and code = 'USD-INTL'
      limit 1
    `;
    const portfolio = portfolios?.[0] || null;
    if (!portfolio) return json(res, 404, { ok:false, error:'PORTFOLIO_NOT_FOUND' });

    const rows = await sql`
      select
        t.transaction_type, t.trade_date, a.symbol as ticker,
        t.gross_amount, t.tax_amount, t.external_ref, t.metadata,
        t.metadata ->> 'ledgerFingerprint' as ledger_fingerprint
      from transactions t
      left join assets a on a.id = t.asset_id
      where t.portfolio_id = ${portfolio.id}
        and t.transaction_type = 'TAX'
        and t.metadata ->> 'ledgerFingerprint' = ${EXPECTED.fingerprint}
        and t.external_ref not like 'NCI-BASELINE:%'
      order by t.trade_date asc, t.created_at asc, t.id asc
    `;

    const comparison = compareTaxShadowRows(rows);
    const checks = {
      readOnly:true,
      authenticated:true,
      frozen:portfolio.status === 'FROZEN',
      baselineProtected:portfolio.baseline_version === 'NCI USD 1.1.02',
      fingerprint:rows.every(row => row.ledger_fingerprint === EXPECTED.fingerprint),
      events9:comparison.eventCount === EXPECTED.eventCount,
      normalizedTotal054:comparison.normalizedTotal === EXPECTED.total,
      legacyTotal054:comparison.legacyTotal === EXPECTED.total,
      zeroDifference:comparison.totalDifference === 0,
      zeroDivergences:comparison.divergences.length === 0,
      equivalent:comparison.equivalent === true,
      writesBlocked:comparison.writeOperationsEnabled === false
    };

    return json(res, 200, {
      ok:true,
      mode:'READ_ONLY',
      phase:'2.4',
      authenticated:true,
      portfolio:{
        code:portfolio.code,
        status:portfolio.status,
        baselineVersion:portfolio.baseline_version
      },
      fingerprint:EXPECTED.fingerprint,
      strategy:'SHADOW_COMPARISON',
      comparison,
      checks,
      validation:Object.values(checks).every(Boolean) ? 'PASS' : 'REVIEW_REQUIRED',
      dashboardCalculationChanged:false,
      writeOperationsEnabled:false,
      timestamp:new Date().toISOString()
    });
  } catch (error) {
    const status = Number(error?.httpStatus) || 500;
    return json(res, status, {
      ok:false,
      error:error?.code || error?.message || 'TAX_SHADOW_COMPARISON_FAILED',
      message:status === 500 ? 'Unable to compare TAX calculations in read-only mode.' : error.message
    });
  }
}
