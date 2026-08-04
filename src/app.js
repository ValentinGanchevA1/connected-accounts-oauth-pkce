import 'dotenv/config';
import express from 'express';
import oauthRoutes from './routes/oauth.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OAuth routes
app.use('/oauth', oauthRoutes);

// Simple root
app.get('/', (_req, res) => {
  res.json({
    message: 'Connected Accounts OAuth + PKCE server',
    endpoints: {
      start: 'GET /oauth/:provider/start',
      callback: 'GET /oauth/:provider/callback',
      list: 'GET /oauth/connections',
      disconnect: 'DELETE /oauth/:provider',
    },
  });
});

app.listen(PORT, () => {
  console.log(`OAuth server running on port ${PORT}`);
  console.log(`BACKEND_URL = ${process.env.BACKEND_URL || '(not set)'}`);
});
