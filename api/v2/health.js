 import { databaseHealth } from '../../lib/db.js';
import { json, methodNotAllowed } from '../../lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const database = await databaseHealth();
  const ok = database.reachable === true && database.status === 'READY';

  return json(res, ok ? 200 : 503, {
    ok,
    service: 'NCI Data Layer v2',
    apiVersion: '2.0',
    schemaVersion: '0.1',
    baselineProtected: 'NCI USD 1.1.02',
    database,
    timestamp: new Date().toISOString()
  });
}
