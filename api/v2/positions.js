import { db } from '../../lib/db.js';
import { json, methodNotAllowed } from '../../lib/http.js';
import { requireNeonIdentity } from '../../lib/auth-jwt.js';

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
    const appUser = users?.[0] || null;

    if (!appUser) {
      return json(res, 403, {
        ok: false,
        error: 'IDENTITY_NOT_LINKED',
        message: 'Authenticated Neon identity is not linked to NCI app_users.'
      });
    }

    const portfolios = await sql`
      select id, code, name, base_currency, status, baseline_version
      from portfolios
      where user_id = ${appUser.id}
        and code = 'USD-INTL'
      limit 1
    `;
    const portfolio = portfolios?.[0] || null;

    if (!portfolio) {
      return json(res, 404, {
        ok: false,
        error: 'PORTFOLIO_NOT_FOUND',
        message: 'USD-INTL portfolio was not found for authenticated identity.'
      });
    }

    const snapshots = await sql`
      select
        id,
        platform_version,
        state_json,
        fingerprint,
        created_at
      from platform_snapshots
      where portfolio_id = ${portfolio.id}
        and snapshot_type = 'MIGRATION'
        and state_json ->> 'snapshotKind' = 'POSITION_BASELINE'
      order by created_at desc
      limit 1
    `;
    const snapshot = snapshots?.[0] || null;

    if (!snapshot) {
      return json(res, 404, {
        ok: false,
        error: 'POSITION_BASELINE_NOT_MIGRATED',
        message: 'No migrated position baseline exists for USD-INTL.'
      });
    }

    const state = snapshot.state_json || {};
    const positions = Array.isArray(state.positions) ? state.positions : [];

    const investedUsd = positions.reduce(
      (sum, x) => sum + Number(x?.investedUsd || 0),
      0
    );

    return json(res, 200, {
      ok: true,
      mode: 'READ_ONLY',
      authenticated: true,
      identity: {
        subject: appUser.auth_subject,
        email: appUser.email,
        displayName: appUser.display_name
      },
      portfolio: {
        id: portfolio.id,
        code: portfolio.code,
        name: portfolio.name,
        baseCurrency: portfolio.base_currency,
        status: portfolio.status,
        baselineVersion: portfolio.baseline_version
      },
      positionBaseline: {
        snapshotId: snapshot.id,
        platformVersion: snapshot.platform_version,
        fingerprint: snapshot.fingerprint,
        createdAt: snapshot.created_at,
        costBasisAuthority: 'MIGRATED_BASELINE_NOT_LEDGER_DERIVED',
        marketPricesIncluded: state.marketPricesIncluded === true
      },
      positions,
      count: positions.length,
      totals: {
        investedUsd: Number(investedUsd.toFixed(2)),
        equityCount: positions.filter(x => x.assetClass !== 'CASH').length,
        cashCount: positions.filter(x => x.assetClass === 'CASH').length
      },
      writeOperationsEnabled: false,
      baselineProtected: 'NCI USD 1.1.02',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const status = Number(error?.httpStatus) || 500;
    return json(res, status, {
      ok: false,
      error: error?.code || 'POSITIONS_READ_FAILED',
      message: status === 500 ? 'Unable to read migrated positions.' : error.message
    });
  }
}
