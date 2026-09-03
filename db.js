import { neon } from '@neondatabase/serverless';

let sqlClient = null;

export function hasDatabaseConfig() {
  return Boolean(process.env.DATABASE_URL);
}

export function db() {
  if (!hasDatabaseConfig()) {
    const error = new Error('DATABASE_URL is not configured');
    error.code = 'NCI_DB_NOT_CONFIGURED';
    throw error;
  }
  if (!sqlClient) sqlClient = neon(process.env.DATABASE_URL);
  return sqlClient;
}

export async function databaseHealth() {
  if (!hasDatabaseConfig()) {
    return { configured: false, reachable: false, status: 'NOT_CONFIGURED' };
  }

  try {
    const sql = db();
    const rows = await sql`
      select
        current_database() as database,
        current_schema() as schema_name,
        now() as server_time,
        (
          select count(*)::int
          from information_schema.tables
          where table_schema = 'public'
            and table_name in (
              'app_users','portfolios','assets','portfolio_assets',
              'transactions','market_snapshots','fundamentals_snapshots',
              'radar_assets','policy_versions','audit_certificates',
              'platform_snapshots','user_settings'
            )
        ) as nci_tables
    `;

    const row = rows?.[0] || {};
    const tableCount = Number(row.nci_tables || 0);

    return {
      configured: true,
      reachable: true,
      status: tableCount === 12 ? 'READY' : 'SCHEMA_INCOMPLETE',
      database: row.database ?? null,
      schema: row.schema_name ?? null,
      nciTables: tableCount,
      expectedTables: 12,
      serverTime: row.server_time ?? null
    };
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      status: 'ERROR',
      error: error?.message || 'Database connection failed'
    };
  }
}
