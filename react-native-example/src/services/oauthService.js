/**
 * React Native OAuth service
 * Talks to your backend and opens the system browser for PKCE flow.
 */

const API_BASE = 'https://api.yourapp.com'; // ← change to your backend URL

/**
 * Start the OAuth flow for a provider.
 * Returns the authorization URL that must be opened in a system browser.
 */
export async function startOAuth(provider, userId) {
  const res = await fetch(`${API_BASE}/oauth/${provider}/start`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId, // demo auth – replace with real JWT
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to start OAuth for ${provider}`);
  }

  const data = await res.json();
  return data.authUrl;
}

/**
 * Fetch current connections + trust score
 */
export async function getConnections(userId) {
  const res = await fetch(`${API_BASE}/oauth/connections`, {
    headers: {
      'X-User-Id': userId,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to load connections');
  }

  return res.json();
}

/**
 * Disconnect a provider
 */
export async function disconnectProvider(provider, userId) {
  const res = await fetch(`${API_BASE}/oauth/${provider}`, {
    method: 'DELETE',
    headers: {
      'X-User-Id': userId,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to disconnect ${provider}`);
  }

  return res.json();
}
