/**
 * POST /api/auth/login
 * Body: { code: string }
 * Exchanges Google auth code for tokens, verifies user, upserts in D1.
 */
interface Env {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // Parse request body
  let code: string;
  try {
    const body = await request.json() as { code?: string };
    code = body.code || '';
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  if (!code) {
    return json({ error: 'Missing auth code' }, 400);
  }

  const clientId = env.GOOGLE_CLIENT_ID || '974859501286-sa67i61lon92g2d77ap1m2pv5d4memtb.apps.googleusercontent.com';
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientSecret) {
    return json({ error: 'Server not configured: missing Google client secret' }, 500);
  }
  const redirectUri = 'https://removeimagesbg.shop';

  // Step 1: Exchange auth code for tokens
  let idToken: string;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Token exchange failed:', err);
      return json({ error: 'Invalid auth code' }, 401);
    }

    const tokens = await tokenRes.json() as { id_token?: string; access_token?: string };
    idToken = tokens.id_token || '';
    if (!idToken) {
      return json({ error: 'No id_token in response' }, 500);
    }
  } catch (err: any) {
    console.error('Token exchange error:', err.message);
    return json({ error: 'Failed to verify with Google' }, 500);
  }

  // Step 2: Decode the id_token (it's a JWT) to get user info
  // The id_token contains: sub, name, email, picture, etc.
  let userInfo: { sub: string; name: string; email: string; picture?: string };
  try {
    // JWT payload is base64url encoded in the middle segment
    const payload = idToken.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    userInfo = {
      sub: decoded.sub,
      name: decoded.name || '',
      email: decoded.email || '',
      picture: decoded.picture || '',
    };
  } catch {
    return json({ error: 'Failed to parse id_token' }, 500);
  }

  if (!userInfo.sub || !userInfo.email) {
    return json({ error: 'Incomplete user info from Google' }, 400);
  }

  // Step 3: Upsert user in D1
  try {
    const existing = await env.DB.prepare(
      'SELECT id, google_id, name, email, picture FROM users WHERE google_id = ?'
    ).bind(userInfo.sub).first<{ id: number; google_id: string; name: string; email: string; picture: string | null }>();

    if (existing) {
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
