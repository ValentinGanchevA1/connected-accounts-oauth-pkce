import express from 'express';
import axios from 'axios';
import { OAUTH_PROVIDERS } from '../config/oauth.js';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from '../utils/pkce.js';
import { updateTrustScore } from '../services/trustScore.js';
import {
  saveSocialConnection,
  getUserConnections,
  removeSocialConnection,
} from '../services/connections.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// In-memory store for pending auth (use Redis in production)
const pendingAuth = new Map(); // state → { userId, provider, codeVerifier, expires }

/**
 * STEP 1: Start OAuth + PKCE flow
 * GET /oauth/:provider/start
 *
 * Returns { authUrl } that the mobile app should open in a system browser.
 */
router.get('/:provider/start', requireAuth, (req, res) => {
  const providerKey = req.params.provider.toLowerCase();
  const provider = OAUTH_PROVIDERS[providerKey];

  if (!provider) {
    return res.status(400).json({ error: 'Unsupported provider' });
  }

  if (!provider.clientId) {
    return res.status(500).json({
      error: `Missing client credentials for ${providerKey}. Check environment variables.`,
    });
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Store for later verification (10 min expiry)
  pendingAuth.set(state, {
    userId: req.user.id,
    provider: providerKey,
    codeVerifier,
    expires: Date.now() + 10 * 60 * 1000,
  });

  const redirectUri = `${process.env.BACKEND_URL}/oauth/${providerKey}/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: provider.clientId,
    redirect_uri: redirectUri,
    scope: provider.scopes.join(provider.scopeSeparator),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `${provider.authorizeUrl}?${params.toString()}`;

  res.json({
    authUrl,
    state, // optional – useful for debugging
  });
});

/**
 * STEP 2: OAuth callback – exchange code for tokens
 * GET /oauth/:provider/callback?code=...&state=...
 */
router.get('/:provider/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  const providerKey = req.params.provider.toLowerCase();
  const provider = OAUTH_PROVIDERS[providerKey];

  const frontendBase = process.env.FRONTEND_URL || 'myapp://connected-accounts';

  if (error) {
    return res.redirect(
      `${frontendBase}?error=${encodeURIComponent(error)}&description=${encodeURIComponent(error_description || '')}`
    );
  }

  if (!code || !state || !provider) {
    return res.status(400).send('Missing code, state or invalid provider');
  }

  const pending = pendingAuth.get(state);
  if (!pending || pending.expires < Date.now()) {
    pendingAuth.delete(state);
    return res.redirect(`${frontendBase}?error=invalid_or_expired_state`);
  }

  // One-time use
  pendingAuth.delete(state);

  try {
    const redirectUri = `${process.env.BACKEND_URL}/oauth/${providerKey}/callback`;

    // Exchange authorization code + code_verifier for tokens
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: provider.clientId,
      code_verifier: pending.codeVerifier,
    });

    // Most providers still accept/require client_secret even with PKCE
    if (provider.clientSecret) {
      tokenParams.append('client_secret', provider.clientSecret);
    }

    const tokenResponse = await axios.post(provider.tokenUrl, tokenParams, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Fetch user profile from the provider
    const userInfoResponse = await axios.get(provider.userInfoUrl, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const profile = userInfoResponse.data;
    const providerUserId = provider.extractUserId
      ? provider.extractUserId(profile)
      : profile.id;

    if (!providerUserId) {
      throw new Error('Could not extract provider user id from profile');
    }

    // Persist the connection
    await saveSocialConnection({
      userId: pending.userId,
      provider: providerKey,
      providerUserId: String(providerUserId),
      accessToken: access_token, // encrypt in production!
      refreshToken: refresh_token || null,
      expiresAt: expires_in
        ? new Date(Date.now() + expires_in * 1000).toISOString()
        : null,
      rawProfile: profile,
    });

    // Recalculate trust score
    const connections = await getUserConnections(pending.userId);
    const providers = connections.map((c) => c.provider);
    const newScore = await updateTrustScore(pending.userId, providers);

    // Redirect back to the app (deep link or web)
    res.redirect(
      `${frontendBase}?success=${providerKey}&score=${newScore}`
    );
  } catch (err) {
    console.error(
      'OAuth callback error:',
      err.response?.data || err.message
    );
    res.redirect(`${frontendBase}?error=token_exchange_failed`);
  }
});

/**
 * List current connections for the authenticated user
 * GET /oauth/connections
 */
router.get('/connections', requireAuth, async (req, res) => {
  const connections = await getUserConnections(req.user.id);
  const providers = connections.map((c) => c.provider);
  const score = await updateTrustScore(req.user.id, providers);

  res.json({
    connections: connections.map((c) => ({
      provider: c.provider,
      providerUserId: c.providerUserId,
      connectedAt: c.connectedAt,
      lastVerified: c.lastVerified,
    })),
    trustScore: score,
  });
});

/**
 * Disconnect a provider
 * DELETE /oauth/:provider
 */
router.delete('/:provider', requireAuth, async (req, res) => {
  const providerKey = req.params.provider.toLowerCase();
  await removeSocialConnection(req.user.id, providerKey);

  const connections = await getUserConnections(req.user.id);
  const providers = connections.map((c) => c.provider);
  const newScore = await updateTrustScore(req.user.id, providers);

  res.json({ success: true, trustScore: newScore });
});

export default router;
