/**
 * POST /api/paypal/capture-order
 * Captures an approved PayPal order and returns the plan details.
 */
interface Env {
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
}

const PLANS: Record<string, { name: string; credits: number }> = {
  starter: { name: 'Starter', credits: 20 },
  pro:     { name: 'Pro',     credits: 80 },
};

const PAYPAL_BASE = 'https://api-m.sandbox.paypal.com';

async function getAccessToken(env: Env): Promise<string> {
  const id = env.PAYPAL_CLIENT_ID || 'Ac8s_D3tEG7BTjjHg9QyPAD9jtHgcXOx_yE7q6ExRglTmBf3kt4eSVATLU9fZhUgs3KpdIR6OyfrBeNI';
  const secret = env.PAYPAL_CLIENT_SECRET || 'ELQAf55dJrvguVzaKNMrQM-xTW3sApHIR-jGOQSiaJIKXw6Jh3qNu4UEcwe1_ef1p35ADToplaXglqUE';
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
  let orderId: string; let planKey: string;
  try { const b = await request.json() as { orderId?: string; plan?: string }; orderId = b.orderId || ''; planKey = b.plan || ''; } catch { return json({ error: 'Invalid request' }, 400); }
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
      return json({
        success: true,
        plan: plan.name,
        credits: plan.credits,
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
