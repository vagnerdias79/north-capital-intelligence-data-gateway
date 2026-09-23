import { db } from '../../lib/db.js';
import { json, methodNotAllowed } from '../../lib/http.js';
import { requireNeonIdentity } from '../../lib/auth-jwt.js';
import { reconcile } from '../../lib/ledger-reconciliation.js';

const EXPECTED = Object.freeze({
  fingerprint: 'NCI-LEDGER-AEF25E9D3A64',
  total: 170,
  pairs: 85,
  divergences: 9
});

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  try {
    const identity = await requireNeonIdentity(req);
    const sql = db();

    const users = await sql`
      select id, auth_subject, email, display_name
      from app_users
      where auth_subject = ${identity.subject}
      limit 1
    `;
    const user = users?.[0] || null;
    if (!user) return json(res, 403, { ok:false, error:'IDENTITY_NOT_LINKED' });

    const portfolios = await sql`
      select id, code, name, base_currency, status, baseline_version
      from portfolios
      where user_id = ${user.id} and code = 'USD-INTL'
      limit 1
    `;
    const portfolio = portfolios?.[0] || null;
    if (!portfolio) return json(res, 404, { ok:false, error:'PORTFOLIO_NOT_FOUND' });

    const snapshots = await sql`
      select id, platform_version, fingerprint, created_at
      from platform_snapshots
      where portfolio_id = ${portfolio.id}
        and snapshot_type = 'MIGRATION'
        and state_json ->> 'snapshotKind' = 'LEDGER_BASELINE'
      order by created_at desc
      limit 1
    `;
    const snapshot = snapshots?.[0] || null;
    if (!snapshot) return json(res, 404, { ok:false, error:'LEDGER_BASELINE_NOT_MIGRATED' });

    const rows = await sql`
      select
        t.id, t.transaction_type, t.trade_date, t.settlement_date,
        a.symbol as ticker, t.quantity, t.unit_price, t.gross_amount,
        t.fee_amount, t.tax_amount, t.currency, t.fx_rate, t.external_ref,
        t.source, t.notes, t.metadata,
        t.metadata ->> 'ledgerFingerprint' as ledger_fingerprint,
        t.created_at
      from transactions t
      left join assets a on a.id = t.asset_id
      where t.portfolio_id = ${portfolio.id}
      order by t.trade_date asc, t.created_at asc, t.id asc
    `;

    const baselines = rows.filter(row => row.ledger_fingerprint === snapshot.fingerprint);
    const originals = rows.filter(row => row.ledger_fingerprint !== snapshot.fingerprint);
    const result = reconcile(originals, baselines);
    const divergentPairs = result.pairs.filter(pair => pair.status === 'DIVERGENT');
    const checks = {
      readOnly: true,
      fingerprint: snapshot.fingerprint === EXPECTED.fingerprint,
      total170: rows.length === EXPECTED.total,
      originals85: originals.length === EXPECTED.pairs,
      baselines85: baselines.length === EXPECTED.pairs,
      paired85: result.pairs.length === EXPECTED.pairs,
      divergences9: divergentPairs.length === EXPECTED.divergences,
      noUnmatched: result.unmatchedOriginals.length === 0 && result.unmatchedBaselines.length === 0,
      frozen: portfolio.status === 'FROZEN',
      baselineProtected: portfolio.baseline_version === 'NCI USD 1.1.02'
    };

    return json(res, 200, {
      ok:true,
      mode:'READ_ONLY',
      phase:'2.1',
      authenticated:true,
      portfolio:{
        code:portfolio.code,
        status:portfolio.status,
        baselineVersion:portfolio.baseline_version
      },
      ledgerBaseline:{
        snapshotId:snapshot.id,
        platformVersion:snapshot.platform_version,
        fingerprint:snapshot.fingerprint,
        createdAt:snapshot.created_at
      },
      counts:{
        total:rows.length,
        originals:originals.length,
        baselines:baselines.length,
        paired:result.pairs.length,
        divergentPairs:divergentPairs.length
      },
      checks,
      validation:Object.values(checks).every(Boolean) ? 'PASS' : 'REVIEW_REQUIRED',
      divergences:divergentPairs,
      unmatched:{
        originals:result.unmatchedOriginals,
        baselines:result.unmatchedBaselines
      },
      writeOperationsEnabled:false,
      timestamp:new Date().toISOString()
    });
  } catch (error) {
    const status = Number(error?.httpStatus) || 500;
    return json(res, status, {
      ok:false,
      error:error?.code || 'LEDGER_RECONCILIATION_FAILED',
      message:status === 500 ? 'Unable to reconcile ledger in read-only mode.' : error.message
    });
  }
}
