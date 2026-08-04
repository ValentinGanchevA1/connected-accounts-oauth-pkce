/**
 * OAuth 2.0 + PKCE provider configuration
 *
 * Add new providers here. Most modern providers support PKCE with S256.
 */
export const OAUTH_PROVIDERS = {
  x: {
    name: 'X',
    clientId: process.env.X_CLIENT_ID,
    clientSecret: process.env.X_CLIENT_SECRET,
    authorizeUrl: 'https://x.com/i/oauth2/authorize',
    tokenUrl: 'https://api.x.com/2/oauth2/token',
    userInfoUrl: 'https://api.x.com/2/users/me',
    scopes: ['users.read', 'tweet.read', 'offline.access'],
    scopeSeparator: ' ',
    // X returns user data nested under .data
    extractUserId: (profile) => profile?.data?.id,
  },

  spotify: {
    name: 'Spotify',
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    authorizeUrl: 'https://accounts.spotify.com/authorize',
    tokenUrl: 'https://accounts.spotify.com/api/token',
    userInfoUrl: 'https://api.spotify.com/v1/me',
    scopes: ['user-read-private', 'user-read-email'],
    scopeSeparator: ' ',
    extractUserId: (profile) => profile?.id,
  },

  // Future providers can be added here:
  // tiktok, linkedin, facebook, instagram...
};

export const TRUST_SCORE_MAP = {
  x: 15,
  spotify: 5,
  linkedin: 20,
  instagram: 15,
  facebook: 10,
  tiktok: 10,
};
