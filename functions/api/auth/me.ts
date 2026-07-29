/**
 * GET /api/auth/me
 * Returns cached user info from localStorage. The frontend manages the session.
 */
export const onRequestGet: PagesFunction = async () => {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
