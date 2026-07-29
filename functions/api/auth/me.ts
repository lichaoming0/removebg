/**
 * GET /api/auth/me
 * Header: Authorization: Bearer <google_access_token>
 * Returns the current user info from D1.
 * If user not found in D1, returns user info from Google directly.
 */
interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authHeader = request.headers.get('Authorization') || '';
  const accessToken = authHeader.replace(/^Bearer\s+/i, '');

  if (!accessToken) {
    return json({ error: 'Missing access token' }, 401);
  }

  // Verify with Google
  let userInfo: { sub: string; name: string; email: string; picture?: string };
  try {
    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!googleRes.ok) {
      return json({ error: 'Token expired or invalid' }, 401);
    }
    userInfo = await googleRes.json() as typeof userInfo;
  } catch {
    return json({ error: 'Failed to verify token' }, 500);
  }

  // Look up in D1
  try {
    const row = await env.DB.prepare(
      'SELECT id, google_id, name, email, picture FROM users WHERE google_id = ?'
    ).bind(userInfo.sub).first<{ id: number; google_id: string; name: string; email: string; picture: string | null }>();

    if (row) {
      return json({
        user: {
          id: row.id,
          google_id: row.google_id,
          name: row.name,
          email: row.email,
          picture: row.picture || '',
        },
      });
    }
  } catch (err: any) {
    console.error('D1 error:', err.message);
  }

  // Fallback: return Google info without D1 id
  return json({
    user: {
      id: 0,
      google_id: userInfo.sub,
      name: userInfo.name,
      email: userInfo.email,
      picture: userInfo.picture || '',
    },
  });
};

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
