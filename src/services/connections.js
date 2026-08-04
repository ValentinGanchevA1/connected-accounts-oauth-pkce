/**
 * In-memory store for demo purposes.
 * Replace with real database queries in production.
 */

const connections = new Map(); // key: `${userId}:${provider}` → connection object

/**
 * Save a social connection for a user
 */
export async function saveSocialConnection({
  userId,
  provider,
  providerUserId,
  accessToken,
  refreshToken,
  expiresAt,
  rawProfile,
}) {
  const key = `${userId}:${provider}`;

  const record = {
    userId,
    provider,
    providerUserId,
    accessToken, // In production: encrypt before storing
    refreshToken,
    expiresAt,
    profileData: rawProfile,
    connectedAt: new Date().toISOString(),
    lastVerified: new Date().toISOString(),
  };

  connections.set(key, record);

  console.log(`[Connections] Saved ${provider} for user ${userId}`);
  return record;
}

/**
 * Get all connected providers for a user
 */
export async function getUserConnections(userId) {
  const result = [];
  for (const [key, value] of connections.entries()) {
    if (key.startsWith(`${userId}:`)) {
      result.push(value);
    }
  }
  return result;
}

/**
 * Disconnect a provider
 */
export async function removeSocialConnection(userId, provider) {
  const key = `${userId}:${provider}`;
  const deleted = connections.delete(key);
  console.log(`[Connections] Removed ${provider} for user ${userId}: ${deleted}`);
  return deleted;
}
