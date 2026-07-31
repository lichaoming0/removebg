/**
 * POST /api/paypal/capture-order
 * Captures an approved PayPal order and credits the user in D1.
 */
interface Env {
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
  DB: D1Database;
}

const PLANS: Record<string, { name: string; credits: number }> = {
  starter: { name: 'Starter', credits: 20 },
  pro:     { name: 'Pro',     credits: 80 },
};

const PAYPAL_BASE = 'https://api-m.sandbox.paypal.com';

async function getAccessToken(env: Env): Promise<string> {
  const id = env.PAYPAL_CLIENT_ID;
  const secret = env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error('PayPal credentials not configured');
  const auth = btoa(`${id}:${secret}`);
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let orderId: string; let planKey: string; let googleId: string;
  try {
    const b = await request.json() as { orderId?: string; plan?: string; google_id?: string };
    orderId = b.orderId || '';
    planKey = b.plan || '';
    googleId = b.google_id || '';
  } catch { return json({ error: 'Invalid request' }, 400); }
  if (!orderId) return json({ error: 'Missing orderId' }, 400);

  const plan = PLANS[planKey];
  if (!plan) return json({ error: 'Invalid plan' }, 400);

  try {
    const token = await getAccessToken(env);
    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const capture = await captureRes.json() as { status?: string; id?: string };
    if (capture.status === 'COMPLETED') {
      let newCredits = plan.credits;

      // Update credits in D1 if google_id is provided
      if (googleId && env.DB) {
        try {
          await env.DB.prepare('UPDATE users SET credits = credits + ? WHERE google_id = ?')
            .bind(plan.credits, googleId).run();
          const row = await env.DB.prepare('SELECT credits FROM users WHERE google_id = ?')
            .bind(googleId).first<{ credits: number }>();
          if (row) newCredits = row.credits;
        } catch (dbErr: any) {
          console.error('D1 credit update error:', dbErr.message);
        }
      }

      return json({
        success: true,
        plan: plan.name,
        credits: newCredits,
        totalCredits: newCredits,
        orderId: capture.id,
      });
    }
    return json({ error: 'Payment not completed', status: capture.status }, 400);
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
};

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
