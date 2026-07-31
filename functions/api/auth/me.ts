/**
 * GET /api/auth/me?google_id=xxx
 * Returns user info and credits from D1.
 */
interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const googleId = url.searchParams.get('google_id');

  if (!googleId) {
    return json({ error: 'Missing google_id' }, 400);
  }

  if (!env.DB) {
    return json({ error: 'Database not available' }, 500);
  }

  try {
    const user = await env.DB.prepare(
      'SELECT id, google_id, name, email, picture, credits FROM users WHERE google_id = ?'
    ).bind(googleId).first<{
      id: number; google_id: string; name: string; email: string; picture: string; credits: number;
    }>();

    if (!user) {
      return json({ error: 'User not found' }, 404);
    }

    return json({ user: { id: user.id, google_id: user.google_id, name: user.name, email: user.email, picture: user.picture, credits: user.credits || 0 } });
  } catch (err: any) {
    console.error('D1 error:', err.message);
    return json({ error: 'Database error' }, 500);
  }
};

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
