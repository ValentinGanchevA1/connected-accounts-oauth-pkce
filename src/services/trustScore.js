import { TRUST_SCORE_MAP } from '../config/oauth.js';

/**
 * Recalculate and persist the user's trust score based on connected accounts.
 * In a real app this would query your database.
 *
 * @param {string} userId
 * @param {string[]} connectedProviders  e.g. ['x', 'spotify']
 * @returns {number} new trust score (capped at 100)
 */
export async function updateTrustScore(userId, connectedProviders = []) {
  let score = 0;

  for (const provider of connectedProviders) {
    score += TRUST_SCORE_MAP[provider] || 0;
  }

  // Optional bonuses can be added here
  // e.g. account age, verified email on provider, etc.

  const finalScore = Math.min(score, 100);

  // TODO: persist to database
  // await db.query('UPDATE users SET trust_score = $1 WHERE id = $2', [finalScore, userId]);

  console.log(`[TrustScore] User ${userId} → ${finalScore} (providers: ${connectedProviders.join(', ') || 'none'})`);

  return finalScore;
}
