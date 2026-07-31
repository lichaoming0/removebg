/**
 * POST /api/auth/login
 * Exchanges Google auth code for id_token, upserts user in D1.
 */
interface Env {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let code: string; let redirectUri: string;
  try {
    const body = await request.json() as { code?: string; redirect_uri?: string };
    code = body.code || '';
    redirectUri = body.redirect_uri || 'https://removeimagesbg.shop';
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
  if (!code) return json({ error: 'Missing auth code' }, 400);

  const clientId = env.GOOGLE_CLIENT_ID || '974859501286-sa67i61lon92g2d77ap1m2pv5d4memtb.apps.googleusercontent.com';
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientSecret) return json({ error: 'Server not configured: missing Google client secret' }, 500);

  // Exchange auth code for id_token
  let idToken: string;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirectUri, grant_type: 'authorization_code',
      }).toString(),
    });
    if (!tokenRes.ok) return json({ error: 'Invalid auth code' }, 401);
    const tokens = await tokenRes.json() as { id_token?: string };
    idToken = tokens.id_token || '';
    if (!idToken) return json({ error: 'No id_token returned' }, 500);
  } catch (err: any) {
    console.error('Token exchange error:', err.message);
    return json({ error: 'Failed to verify with Google' }, 500);
  }

  // Decode JWT
  let sub: string, name: string, email: string, picture: string;
  try {
    const payload = JSON.parse(atob(idToken.split('.')[1]));
    sub = payload.sub || ''; name = payload.name || ''; email = payload.email || ''; picture = payload.picture || '';
  } catch {
    return json({ error: 'Failed to parse id_token' }, 500);
  }
  if (!sub || !email) return json({ error: 'Incomplete user info' }, 400);

  // Upsert in D1
  try {
    const exist = await env.DB.prepare('SELECT id, credits FROM users WHERE google_id = ?').bind(sub).first<{id:number; credits:number}>();
    if (exist) {
      await env.DB.prepare('UPDATE users SET name=?, email=?, picture=?, last_login=datetime(\'now\') WHERE google_id=?')
        .bind(name, email, picture, sub).run();
      return json({ user: { id: exist.id, google_id: sub, name, email, picture, credits: exist.credits || 0 } });
    }
    const ins = await env.DB.prepare('INSERT INTO users (google_id,name,email,picture,credits) VALUES (?,?,?,?,0)')
      .bind(sub, name, email, picture).run();
    return json({ user: { id: ins.meta?.last_row_id || 0, google_id: sub, name, email, picture, credits: 0 } }, 201);
  } catch (err: any) {
    console.error('D1 error:', err.message);
    return json({ error: 'Database error' }, 500);
  }
};

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
