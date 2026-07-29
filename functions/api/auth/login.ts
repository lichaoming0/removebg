/**
 * POST /api/auth/login
 * Body: { access_token: string }
 * Verifies Google access token, upserts user in D1, returns user info.
 */
interface Env {
  DB: D1Database;
  GOOGLE_CLIENT_SECRET?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // Parse request body
  let accessToken: string;
  try {
    const body = await request.json() as { access_token?: string };
    accessToken = body.access_token || '';
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  if (!accessToken) {
    return json({ error: 'Missing access_token' }, 400);
  }

  // Verify token with Google
  let userInfo: { sub: string; name: string; email: string; picture?: string };
  try {
    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!googleRes.ok) {
      return json({ error: 'Invalid Google token' }, 401);
    }
    userInfo = await googleRes.json() as typeof userInfo;
  } catch {
    return json({ error: 'Failed to verify Google token' }, 500);
  }

  if (!userInfo.sub || !userInfo.email) {
    return json({ error: 'Incomplete user info from Google' }, 400);
  }

  // Upsert user in D1
  try {
    // Check if user exists
    const existing = await env.DB.prepare(
      'SELECT id, google_id, name, email, picture FROM users WHERE google_id = ?'
    ).bind(userInfo.sub).first<{ id: number; google_id: string; name: string; email: string; picture: string | null }>();

    if (existing) {
      // Update last_login and optionally name/picture
      await env.DB.prepare(
        'UPDATE users SET name = ?, email = ?, picture = ?, last_login = datetime(\'now\') WHERE google_id = ?'
      ).bind(userInfo.name, userInfo.email, userInfo.picture || '', userInfo.sub).run();

      return json({
        user: {
          id: existing.id,
          google_id: userInfo.sub,
          name: userInfo.name,
          email: userInfo.email,
          picture: userInfo.picture || '',
        },
      });
    } else {
      // Insert new user
      const result = await env.DB.prepare(
        'INSERT INTO users (google_id, name, email, picture) VALUES (?, ?, ?, ?)'
      ).bind(userInfo.sub, userInfo.name, userInfo.email, userInfo.picture || '').run();

      return json({
        user: {
          id: result.meta?.last_row_id || 0,
          google_id: userInfo.sub,
          name: userInfo.name,
          email: userInfo.email,
          picture: userInfo.picture || '',
        },
      }, 201);
    }
  } catch (err: any) {
    console.error('D1 error:', err.message);
    return json({ error: 'Database error' }, 500);
  }
};

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
