import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

interface Plan {
  key: string;
  name: string;
  price: string;
  period: string;
  images: string;
  pricePerImage: string;
  features: string[];
  highlighted: boolean;
}

const PLANS: Plan[] = [
  { key: 'starter', name: 'Starter', price: '$5.99', period: '/month', images: '20', pricePerImage: '$0.30', highlighted: true, features: ['20 HD images per month', 'Only charged on success', 'Full resolution PNG', 'All background options', 'Priority processing', 'Unused credits expire monthly'] },
  { key: 'pro', name: 'Pro', price: '$22.99', period: '/month', images: '80', pricePerImage: '$0.29', highlighted: false, features: ['80 HD images per month', 'Only charged on success', 'Full resolution PNG', 'All background options', 'Fastest processing', 'Unused credits expire monthly'] },
];

const POLICIES = [
  { icon: '✅', title: 'Only on success', desc: 'Credit is consumed only when background removal succeeds. Failed attempts are free.' },
  { icon: '📢', title: 'Over-limit notice', desc: 'When you reach your monthly limit, you\'ll be prompted to upgrade. No automatic charges.' },
  { icon: '📅', title: 'Monthly reset', desc: 'Credits reset each billing month. Unused credits do not roll over.' },
];

const PAYPAL_CLIENT_ID = 'Ac8s_D3tEG7BTjjHg9QyPAD9jtHgcXOx_yE7q6ExRglTmBf3kt4eSVATLU9fZhUgs3KpdIR6OyfrBeNI';

// Poll until window.paypal is available (max 10s)
function waitForPaypal(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).paypal) { resolve(true); return; }
    let n = 0;
    const t = setInterval(() => {
      n++;
      if ((window as any).paypal) { clearInterval(t); resolve(true); return; }
      if (n >= 100) { clearInterval(t); resolve(false); }
    }, 100);
  });
}

const PricingPage: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { isLoggedIn, credits, addCredits, user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'cancel'>('idle');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loadingPayPal, setLoadingPayPal] = useState(false);
  const paypalRenderedRef = useRef(false);
  const userRef = useRef(user);
  const addCreditsRef = useRef(addCredits);
  userRef.current = user;
  addCreditsRef.current = addCredits;

  // Load PayPal SDK on mount
  useEffect(() => {
    if (document.querySelector('#paypal-sdk')) return;
    const s = document.createElement('script');
    s.id = 'paypal-sdk';
    s.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;
    s.async = true;
    document.body.appendChild(s);
  }, []);

  // Render PayPal button — called ONCE per plan selection, never re-called
  const renderPaypalOnce = (planKey: string) => {
    if (paypalRenderedRef.current) return; // already rendered, don't touch
    const container = document.getElementById('paypal-btn-container');
    if (!container) return;
    const pp = (window as any).paypal;
    if (!pp) return;

    paypalRenderedRef.current = true;

    pp.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
      createOrder: async () => {
        const res = await fetch('/api/paypal/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planKey }),
        });
        const d = await res.json();
        if (!d.orderId) throw new Error('Failed to create order');
        return d.orderId;
      },
      onApprove: async (data: any) => {
        const res = await fetch('/api/paypal/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: data.orderId, plan: planKey, google_id: userRef.current?.google_id || '' }),
        });
        const r = await res.json();
        if (r.success) {
          addCreditsRef.current(r.credits);
          setStatus('success');
        }
      },
      onCancel: () => { setStatus('cancel'); },
      onError: (err: any) => { console.error('PayPal error:', err); alert('PayPal error: ' + (err?.message || 'Unknown error')); },
    }).render('#paypal-btn-container');
  };

  // Buy Now handler
  const handleBuyNow = async (planKey: string) => {
    setSelectedPlan(planKey);
    paypalRenderedRef.current = false;

    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }

    setLoadingPayPal(true);
    const ready = await waitForPaypal();
    setLoadingPayPal(false);
    if (!ready) {
      alert('PayPal SDK failed to load. Please check your network and try again.');
      return;
    }

    // Retry until the container div exists (React may not have painted it yet)
    let retries = 0;
    const tryRender = () => {
      const container = document.getElementById('paypal-btn-container');
      if (container) {
        renderPaypalOnce(planKey);
      } else if (retries < 20) {
        retries++;
        setTimeout(tryRender, 100);
      }
    };
    setTimeout(tryRender, 100);
  };

  // ---- Render states ----

  if (status === 'success') {
    const plan = PLANS.find(p => p.key === selectedPlan);
    return (
      <div className="pricing-overlay"><div className="pricing-container" style={{ textAlign: 'center', maxWidth: 480 }}>
        <h2 style={{ fontSize: 32, marginBottom: 12 }}>🎉</h2>
        <h2>Payment Successful!</h2>
        <p style={{ margin: '12px 0', fontSize: 16 }}>
          You now have <strong>{credits} credits</strong> ({plan?.images} added).
        </p>
        <button className="pricing-cta primary" onClick={onClose} style={{ maxWidth: 240, margin: '16px auto' }}>
          Start Removing Backgrounds
        </button>
      </div></div>
    );
  }

  if (status === 'cancel') {
    return (
      <div className="pricing-overlay"><div className="pricing-container" style={{ textAlign: 'center', maxWidth: 480 }}>
        <h2 style={{ fontSize: 32, marginBottom: 12 }}>💳</h2>
        <h2>Payment Cancelled</h2>
        <p style={{ margin: '12px 0', fontSize: 16 }}>No worries — you can try again whenever you're ready.</p>
        <button className="pricing-cta secondary" onClick={() => setStatus('idle')} style={{ maxWidth: 200, margin: '16px auto' }}>
          Back to Plans
        </button>
      </div></div>
    );
  }

  return (
    <div className="pricing-overlay">
      <div className="pricing-container">
        <div className="pricing-header">
          <h2>Simple, fair pricing</h2>
          <p>You only pay when it works. No hidden fees, no auto-charge.</p>
          <button className="pricing-close" onClick={onClose}>×</button>
        </div>

        {/* Plan grid */}
        {!selectedPlan && (
          <div className="pricing-grid">
            <div className="pricing-card">
              <h3>Free</h3>
              <div className="pricing-price"><span className="price-amount">$0</span><span className="price-period">forever</span></div>
              <div className="pricing-images"><strong>1</strong> image/month</div>
              <div className="pricing-per-image">Free</div>
              <ul className="pricing-features">
                <li>✓ 1 HD image per month</li><li>✓ Only charged on success</li><li>✓ Full resolution PNG</li><li>✓ All background options</li><li>✓ Standard processing</li>
              </ul>
              <button className="pricing-cta secondary" onClick={onClose}>Get Started Free</button>
            </div>
            {PLANS.map(plan => (
              <div key={plan.key} className={`pricing-card ${plan.highlighted ? 'highlighted' : ''}`}>
                {plan.highlighted && <span className="pricing-badge">Most Popular</span>}
                <h3>{plan.name}</h3>
                <div className="pricing-price"><span className="price-amount">{plan.price}</span><span className="price-period">{plan.period}</span></div>
                <div className="pricing-images"><strong>{plan.images}</strong> images/month</div>
                <div className="pricing-per-image">{plan.pricePerImage}/image</div>
                <ul className="pricing-features">{plan.features.map(f => <li key={f}>✓ {f}</li>)}</ul>
                <button className="pricing-cta primary" onClick={() => handleBuyNow(plan.key)}>Buy Now</button>
              </div>
            ))}
          </div>
        )}

        {/* Login prompt */}
        {selectedPlan && showLoginPrompt && (
          <div style={{ textAlign: 'center', maxWidth: 420, margin: '0 auto' }}>
            <button onClick={() => { setShowLoginPrompt(false); setSelectedPlan(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', marginBottom: 16, fontSize: 14 }}>← Back to plans</button>
            <h3 style={{ marginBottom: 12 }}>Sign in required</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 20, fontSize: 14 }}>Please sign in with your Google account before purchasing to associate credits with your account.</p>
            <button className="pricing-cta secondary" onClick={() => { setShowLoginPrompt(false); setSelectedPlan(null); onClose(); }}>Close & Sign In</button>
          </div>
        )}

        {/* PayPal checkout */}
        {selectedPlan && isLoggedIn && !showLoginPrompt && (
          <div style={{ textAlign: 'center', maxWidth: 420, margin: '0 auto' }}>
            <button onClick={() => { setSelectedPlan(null); paypalRenderedRef.current = false; }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', marginBottom: 16, fontSize: 14 }}>← Back to plans</button>
            <h3 style={{ marginBottom: 16 }}>{PLANS.find(p => p.key === selectedPlan)?.name} — {PLANS.find(p => p.key === selectedPlan)?.price}</h3>
            {loadingPayPal ? (
              <div style={{ minHeight: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <div className="spinner dark" style={{ width: 32, height: 32, borderWidth: 3 }} />
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>Loading payment form…</p>
              </div>
            ) : (
              <div id="paypal-btn-container" style={{ minHeight: 150 }} />
            )}
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 8 }}>🔒 Sandbox mode — no real money will be charged</p>
          </div>
        )}

        {/* Policies (shown on plan grid) */}
        {!selectedPlan && (
          <>
            <div className="pricing-policies">
              {POLICIES.map(p => (
                <div key={p.title} className="policy-item">
                  <span className="policy-icon">{p.icon}</span>
                  <div><strong>{p.title}</strong><p>{p.desc}</p></div>
                </div>
              ))}
            </div>
            <p className="pricing-footer-note">
              Need more than 80 images/month? <a href="mailto:lichaoming0@gmail.com">Contact us</a> for a custom plan.
              {credits > 0 && <span style={{ marginLeft: 12, color: 'var(--color-primary)', fontWeight: 600 }}>Your credits: {credits}</span>}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default PricingPage;
