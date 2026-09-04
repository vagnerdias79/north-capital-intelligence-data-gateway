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
      select
        id,
        code,
        name,
        base_currency,
        portfolio_type,
        status,
        policy_version,
        baseline_version,
        created_at,
        updated_at
      from portfolios
      where user_id = ${appUser.id}
      order by created_at asc
    `;

    return json(res, 200, {
      ok: true,
      mode: 'READ_ONLY',
      authenticated: true,
      identity: {
        subject: appUser.auth_subject,
        email: appUser.email,
        displayName: appUser.display_name
      },
      portfolios,
      count: portfolios.length,
      writeOperationsEnabled: false,
      baselineProtected: 'NCI USD 1.1.02',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const status = Number(error?.httpStatus) || 500;

    return json(res, status, {
      ok: false,
      error: error?.code || 'PORTFOLIOS_READ_FAILED',
      message: status === 500 ? 'Unable to read portfolios.' : error.message
    });
  }
}
