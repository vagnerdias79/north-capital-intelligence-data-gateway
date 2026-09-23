import { db } from '../../lib/db.js';
import { json, methodNotAllowed } from '../../lib/http.js';
import { requireNeonIdentity } from '../../lib/auth-jwt.js';
import { analyzeTaxRows } from '../../lib/tax-divergence-analysis.js';

const EXPECTED = Object.freeze({
  fingerprint:'NCI-LEDGER-AEF25E9D3A64',
  originals:9,
  baselines:9,
  pairs:9,
  absoluteGrossDifference:0.54
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
        t.id, t.transaction_type, t.trade_date, a.symbol as ticker,
        t.gross_amount, t.tax_amount, t.fee_amount, t.external_ref,
        t.notes, t.metadata,
        t.metadata ->> 'ledgerFingerprint' as ledger_fingerprint
      from transactions t
      left join assets a on a.id = t.asset_id
      where t.portfolio_id = ${portfolio.id}
        and t.transaction_type = 'TAX'
      order by t.trade_date asc, t.created_at asc, t.id asc
    `;

    const analysis = analyzeTaxRows(rows, EXPECTED.fingerprint);
    const checks = {
      readOnly:true,
      frozen:portfolio.status === 'FROZEN',
      baselineProtected:portfolio.baseline_version === 'NCI USD 1.1.02',
      originals9:analysis.originals === EXPECTED.originals,
      baselines9:analysis.baselines === EXPECTED.baselines,
      paired9:analysis.pairs.length === EXPECTED.pairs,
      noUnmatched:analysis.unmatchedOriginals.length === 0 && analysis.unmatchedBaselines.length === 0,
      absoluteDifference054:analysis.absoluteGrossDifference === EXPECTED.absoluteGrossDifference
    };

    return json(res, 200, {
      ok:true,
      mode:'READ_ONLY',
      phase:'2.2',
      authenticated:true,
      portfolio:{
        code:portfolio.code,
        status:portfolio.status,
        baselineVersion:portfolio.baseline_version
      },
      fingerprint:EXPECTED.fingerprint,
      counts:{
        taxRows:rows.length,
        originals:analysis.originals,
        baselines:analysis.baselines,
        paired:analysis.pairs.length
      },
      absoluteGrossDifference:analysis.absoluteGrossDifference,
      checks,
      validation:Object.values(checks).every(Boolean) ? 'PASS' : 'REVIEW_REQUIRED',
      pairs:analysis.pairs,
      unmatched:{
        originals:analysis.unmatchedOriginals,
        baselines:analysis.unmatchedBaselines
      },
      writeOperationsEnabled:false,
      timestamp:new Date().toISOString()
    });
  } catch (error) {
    const status = Number(error?.httpStatus) || 500;
    return json(res, status, {
      ok:false,
      error:error?.code || 'LEDGER_TAX_DIAGNOSTICS_FAILED',
      message:status === 500 ? 'Unable to analyze TAX divergences in read-only mode.' : error.message
    });
  }
}
