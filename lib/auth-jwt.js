import { createRemoteJWKSet, jwtVerify } from 'jose';

let cached = null;

function authBaseUrl() {
  const value =
    process.env.DATABASE_NEON_AUTH_BASE_URL ||
    process.env.NEON_AUTH_BASE_URL;

  if (!value) {
    const error = new Error('Neon Auth base URL is not configured');
    error.code = 'NCI_AUTH_NOT_CONFIGURED';
    throw error;
  }
  return value.replace(/\/+$/, '');
}

function jwksForCurrentAuth() {
  const baseUrl = authBaseUrl();

  if (cached?.baseUrl === baseUrl) {
    return cached.jwks;
  }

  const jwksUrl = new URL(`${baseUrl}/.well-known/jwks.json`);
  const jwks = createRemoteJWKSet(jwksUrl);

  cached = { baseUrl, jwks };
  return jwks;
}

export function bearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() || null;
}

export async function requireNeonIdentity(req) {
  const token = bearerToken(req);

  if (!token) {
    const error = new Error('Authorization Bearer token is required');
    error.code = 'NCI_AUTH_REQUIRED';
    error.httpStatus = 401;
    throw error;
  }

  try {
    const { payload, protectedHeader } = await jwtVerify(
      token,
      jwksForCurrentAuth()
    );

    const subject = typeof payload.sub === 'string' ? payload.sub.trim() : '';

    if (!subject) {
      const error = new Error('Authenticated token has no subject');
      error.code = 'NCI_AUTH_SUBJECT_MISSING';
      error.httpStatus = 401;
      throw error;
    }

    return {
      subject,
      claims: {
        sub: subject,
        email: typeof payload.email === 'string' ? payload.email : null,
        role: typeof payload.role === 'string' ? payload.role : null,
        iss: typeof payload.iss === 'string' ? payload.iss : null,
        aud: payload.aud ?? null,
        exp: payload.exp ?? null
      },
      keyId: protectedHeader.kid ?? null
    };
  } catch (error) {
    if (error?.httpStatus) throw error;

    const wrapped = new Error('Invalid or expired authentication token');
    wrapped.code = 'NCI_AUTH_INVALID';
    wrapped.httpStatus = 401;
    wrapped.cause = error;
    throw wrapped;
  }
}
