# Connected Accounts – OAuth 2.0 + PKCE

Link social media accounts (X, Spotify, …) to a user profile and boost a **trust score**.

This repository contains:

- **Backend** (Node.js + Express) – full Authorization Code + PKCE flow
- **React Native example** – opens the system browser, handles deep-link callback

## Features

- OAuth 2.0 Authorization Code flow with **PKCE (S256)**
- Providers currently implemented: **X** and **Spotify**
- Trust-score calculation based on connected accounts
- Secure `state` + single-use `code_verifier` handling
- Ready for Redis / real database (currently in-memory for demo)

## Quick Start (Backend)

```bash
cp .env.example .env
# fill in X_CLIENT_ID, X_CLIENT_SECRET, SPOTIFY_*, BACKEND_URL, FRONTEND_URL

npm install
npm start
```

### Important endpoints

| Method | Path                        | Description                          |
|--------|-----------------------------|--------------------------------------|
| GET    | `/oauth/:provider/start`    | Returns `{ authUrl }`                |
| GET    | `/oauth/:provider/callback` | Exchanges code → tokens, updates score |
| GET    | `/oauth/connections`        | List connections + current score     |
| DELETE | `/oauth/:provider`          | Disconnect a provider                |

`:provider` can be `x` or `spotify`.

## React Native Example

Located in `react-native-example/`.

```bash
cd react-native-example
npm install
npx expo start
```

Key points:

- Uses `expo-web-browser` → system browser (Safari / Chrome Custom Tabs)
- Deep-link scheme: `myapp://connected-accounts`
- Never uses a WebView for the OAuth consent screen

## Adding more providers

1. Register an app on the provider’s developer portal
2. Add the config to `src/config/oauth.js`
3. (Optional) extend the React Native `PROVIDERS` array

## Security notes

- Always use `code_challenge_method=S256`
- Store `code_verifier` + `state` server-side (Redis recommended)
- Encrypt access / refresh tokens at rest
- Prefer system browser over WebView
- Set short expiry on pending auth records

## License

MIT
