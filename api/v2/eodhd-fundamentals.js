import { requireNeonIdentity } from '../../lib/auth-jwt.js';
import { createHandler } from '../../lib/providers/eodhd-handler.js';
export default createHandler({authenticate:requireNeonIdentity});
