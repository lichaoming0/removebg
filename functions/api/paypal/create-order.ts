/**
 * POST /api/paypal/create-order
 * Creates a PayPal order for a pricing plan.
 */
interface Env {
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
}

const PLANS: Record<string, { name: string; price: string; credits: number }> = {
  starter:  { name: 'Starter',  price: '5.99',  credits: 20 },
  pro:      { name: 'Pro',      price: '22.99', credits: 80 },
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
  let planKey: string;
  try { const b = await request.json() as { plan?: string }; planKey = b.plan || ''; } catch { planKey = ''; }

  const plan = PLANS[planKey];
  if (!plan) return json({ error: 'Invalid plan' }, 400);

  try {
    const token = await getAccessToken(env);
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'USD', value: plan.price },
          description: `removebg ${plan.name} - ${plan.credits} images`,
        }],
        application_context: {
          brand_name: 'Image Background Remover',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: 'https://removeimagesbg.shop/payment/success',
          cancel_url: 'https://removeimagesbg.shop/payment/cancel',
        },
      }),
    });
    const order = await orderRes.json() as { id?: string; status?: string };
    if (order.id) return json({ orderId: order.id });
    return json({ error: 'Failed to create order', detail: order }, 500);
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
};

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
