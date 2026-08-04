/**
 * Simple auth middleware for demo.
 * In production replace with JWT / session validation.
 */
export function requireAuth(req, res, next) {
  // For demo we accept a header or query param
  const userId = req.headers['x-user-id'] || req.query.userId || 'demo-user-123';

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user = { id: userId };
  next();
}
