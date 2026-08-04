import crypto from 'crypto';

/**
 * Generate a high-entropy code_verifier (43-128 characters)
 * RFC 7636 recommends 43-128 characters from the unreserved set.
 */
export function generateCodeVerifier() {
  // 64 random bytes → ~86 character base64url string
  return crypto.randomBytes(64).toString('base64url');
}

/**
 * Create S256 code_challenge from code_verifier
 * code_challenge = BASE64URL(SHA256(code_verifier))
 */
export function generateCodeChallenge(verifier) {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
}

/**
 * Generate a secure random state parameter (CSRF protection)
 */
export function generateState() {
  return crypto.randomBytes(32).toString('base64url');
}
