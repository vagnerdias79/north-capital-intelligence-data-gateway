export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      ok: false,
      error: 'METHOD_NOT_ALLOWED',
      allowed: ['GET']
    });
  }

  const baseUrl =
    process.env.DATABASE_NEON_AUTH_BASE_URL ||
    process.env.NEON_AUTH_BASE_URL ||
    null;

  if (!baseUrl) {
    return res.status(503).json({
      ok: false,
      error: 'NCI_AUTH_NOT_CONFIGURED'
    });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok: true,
    authBaseUrl: baseUrl.replace(/\/+$/, ''),
    provider: 'google',
    callbackPath: '/auth-test.html',
    mode: 'READ_ONLY_TEST'
  });
}
