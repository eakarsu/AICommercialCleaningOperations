'use strict';
function validateRuntime(env = process.env) {
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  if (env.NODE_ENV === 'production' && !(env.DATABASE_URL || (env.DB_NAME && env.DB_USER && env.DB_PASSWORD))) throw new Error('Production database credentials required');
  if (env.NODE_ENV === 'production' && (env.CORS_ORIGINS || '').includes('*')) throw new Error('Wildcard CORS is forbidden in production');
}
module.exports = { validateRuntime };
