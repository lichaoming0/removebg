/**
 * POST /api/auth/login
 * Exchanges Google auth code for id_token, returns user info.
 * D1 storage will be added in a future update.
 */
interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
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

  // Exchange auth code for id_token
  let idToken: string;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: 'https://removeimagesbg.shop',
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Token exchange failed:', err.substring(0, 200));
      return json({ error: 'Invalid auth code' }, 401);
    }

    const tokens = await tokenRes.json() as { id_token?: string };
    idToken = tokens.id_token || '';
    if (!idToken) {
      return json({ error: 'No id_token returned' }, 500);
    }
  } catch (err: any) {
    console.error('Token exchange error:', err.message);
    return json({ error: 'Failed to verify with Google' }, 500);
  }

  // Decode JWT payload to get user info
  try {
    const payload = idToken.split('.')[1];
    const decoded = JSON.parse(atob(payload));

    return json({
      user: {
        id: 0,
        google_id: decoded.sub || '',
        name: decoded.name || '',
        email: decoded.email || '',
        picture: decoded.picture || '',
      },
    });
  } catch {
    return json({ error: 'Failed to parse id_token' }, 500);
  }
};

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
