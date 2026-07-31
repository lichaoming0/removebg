import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  {
    key: 'starter',
    name: 'Starter',
    price: '$5.99',
    period: '/month',
    images: '20',
    pricePerImage: '$0.30',
    highlighted: true,
    features: [
      '20 HD images per month',
      'Only charged on success',
      'Full resolution PNG',
      'All background options',
      'Priority processing',
      'Unused credits expire monthly',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$22.99',
    period: '/month',
    images: '80',
    pricePerImage: '$0.29',
    highlighted: false,
    features: [
      '80 HD images per month',
      'Only charged on success',
      'Full resolution PNG',
      'All background options',
      'Fastest processing',
      'Unused credits expire monthly',
    ],
  },
];

const POLICIES = [
  { icon: '✅', title: 'Only on success', desc: 'Credit is consumed only when background removal succeeds. Failed attempts are free.' },
  { icon: '📢', title: 'Over-limit notice', desc: 'When you reach your monthly limit, you\'ll be prompted to upgrade. No automatic charges.' },
  { icon: '📅', title: 'Monthly reset', desc: 'Credits reset each billing month. Unused credits do not roll over.' },
];

const PAYPAL_CLIENT_ID = 'Ac8s_D3tEG7BTjjHg9QyPAD9jtHgcXOx_yE7q6ExRglTmBf3kt4eSVATLU9fZhUgs3KpdIR6OyfrBeNI';
const PAYPAL_SDK_URL = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;

function waitForPaypal(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).paypal) { resolve(true); return; }
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds at 100ms intervals
    const timer = setInterval(() => {
      attempts++;
      if ((window as any).paypal) { clearInterval(timer); resolve(true); return; }
      if (attempts >= maxAttempts) { clearInterval(timer); resolve(false); }
    }, 100);
  });
}

const PricingPage: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { isLoggedIn, credits, addCredits, user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'success' | 'cancel'>('idle');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [paypalReady, setPaypalReady] = useState(false);
  const [paypalLoading, setPaypalLoading] = useState(false);
  const renderedPlanRef = useRef<string | null>(null);

  // Load PayPal SDK on mount
  useEffect(() => {
    // Already loaded — check immediately
    if ((window as any).paypal) {
      setPaypalReady(true);
      return;
    }

    // Script already in DOM but not loaded yet — poll for it
    if (document.querySelector('#paypal-sdk')) {
      waitForPaypal().then((ready) => { if (ready) setPaypalReady(true); });
      return;
    }

    // Create and inject the SDK script
    const script = document.createElement('script');
    script.id = 'paypal-sdk';
    script.src = PAYPAL_SDK_URL;
    script.async = true;
    script.onload = () => { setPaypalReady(true); };
    script.onerror = () => { console.error('PayPal SDK failed to load'); };
    document.body.appendChild(script);

    return () => {
      // Don't remove the script — it may be used by other components
    };
  }, []);

  // Handle "Buy Now" click
  const handleBuyNow = useCallback(async (planKey: string) => {
    setSelectedPlan(planKey);
    renderedPlanRef.current = null;

    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }

    // PayPal not ready yet — show loading and wait
    if (!(window as any).paypal) {
      setPaypalLoading(true);
      const ready = await waitForPaypal();
      setPaypalLoading(false);
      if (!ready) {
        setStatus('cancel'); // reuse cancel page to show error
        return;
      }
      setPaypalReady(true);
    }

    // Small delay to ensure React has rendered the container div
    setTimeout(() => renderPaypalButton(planKey), 50);
  }, [isLoggedIn]);

  // Render the PayPal button into the container
  const renderPaypalButton = useCallback((planKey: string) => {
    const container = document.getElementById('paypal-btn-container');
    if (!container) {
      console.error('PayPal container not found');
      return;
    }

    const paypal = (window as any).paypal;
    if (!paypal) {
      console.error('PayPal SDK not available');
      return;
    }

    // Avoid re-rendering the same plan
    if (renderedPlanRef.current === planKey) return;
    renderedPlanRef.current = planKey;

    container.innerHTML = '';

    paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },
      createOrder: async () => {
        const res = await fetch('/api/paypal/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planKey }),
        });
        const data = await res.json();
        if (!data.orderId) throw new Error('Failed to create order');
        return data.orderId;
      },
      onApprove: async (data: any) => {
        const res = await fetch('/api/paypal/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: data.orderId, plan: planKey, google_id: user?.google_id || '' }),
        });
        const result = await res.json();
        if (result.success) {
          addCredits(result.credits);
          setStatus('success');
        }
      },
      onCancel: () => { setStatus('cancel'); },
      onError: (err: any) => { console.error('PayPal error:', err); },
    }).render('#paypal-btn-container');
  }, [addCredits, user?.google_id]);

  // Re-render PayPal button when SDK becomes ready and a plan is selected
  useEffect(() => {
    if (selectedPlan && paypalReady && isLoggedIn && !showLoginPrompt) {
      setTimeout(() => renderPaypalButton(selectedPlan), 50);
    }
  }, [selectedPlan, paypalReady, isLoggedIn, showLoginPrompt, renderPaypalButton]);

  // ---- Render ----

  if (status === 'success') {
    const plan = PLANS.find((p) => p.key === selectedPlan);
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

        {selectedPlan ? null : (
          <div className="pricing-grid">
            {/* Free card */}
            <div className="pricing-card">
              <h3>Free</h3>
              <div className="pricing-price">
                <span className="price-amount">$0</span>
                <span className="price-period">forever</span>
              </div>
              <div className="pricing-images"><strong>1</strong> image/month</div>
              <div className="pricing-per-image">Free</div>
              <ul className="pricing-features">
                <li>✓ 1 HD image per month</li>
                <li>✓ Only charged on success</li>
                <li>✓ Full resolution PNG</li>
                <li>✓ All background options</li>
                <li>✓ Standard processing</li>
              </ul>
              <button className="pricing-cta secondary" onClick={onClose}>Get Started Free</button>
            </div>

            {PLANS.map((plan) => (
              <div key={plan.key} className={`pricing-card ${plan.highlighted ? 'highlighted' : ''}`}>
                {plan.highlighted && <span className="pricing-badge">Most Popular</span>}
                <h3>{plan.name}</h3>
                <div className="pricing-price">
                  <span className="price-amount">{plan.price}</span>
                  <span className="price-period">{plan.period}</span>
                </div>
                <div className="pricing-images"><strong>{plan.images}</strong> images/month</div>
                <div className="pricing-per-image">{plan.pricePerImage}/image</div>
                <ul className="pricing-features">
                  {plan.features.map((f) => (<li key={f}>✓ {f}</li>))}
                </ul>
                <button
                  className="pricing-cta primary"
                  onClick={() => handleBuyNow(plan.key)}
                >
                  Buy Now
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Login prompt for unauthenticated users */}
        {selectedPlan && showLoginPrompt && (
          <div style={{ textAlign: 'center', maxWidth: 420, margin: '0 auto' }}>
            <button onClick={() => { setShowLoginPrompt(false); setSelectedPlan(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', marginBottom: 16, fontSize: 14 }}>
              ← Back to plans
            </button>
            <h3 style={{ marginBottom: 12 }}>Sign in required</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 20, fontSize: 14 }}>
              Please sign in with your Google account before purchasing to associate credits with your account.
            </p>
            <button className="pricing-cta secondary" onClick={() => { setShowLoginPrompt(false); setSelectedPlan(null); onClose(); }}>
              Close & Sign In
            </button>
          </div>
        )}

        {/* PayPal checkout for logged-in users */}
        {selectedPlan && isLoggedIn && !showLoginPrompt && (
          <div style={{ textAlign: 'center', maxWidth: 420, margin: '0 auto' }}>
            <button onClick={() => { setSelectedPlan(null); renderedPlanRef.current = null; }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', marginBottom: 16, fontSize: 14 }}>
              ← Back to plans
            </button>
            <h3 style={{ marginBottom: 16 }}>
              {PLANS.find((p) => p.key === selectedPlan)?.name} — {PLANS.find((p) => p.key === selectedPlan)?.price}
            </h3>

            {/* Loading state while PayPal SDK initializes */}
            {paypalLoading && (
              <div style={{
                minHeight: 150, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12,
              }}>
                <div className="spinner dark" style={{ width: 32, height: 32, borderWidth: 3 }} />
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>Loading payment form…</p>
              </div>
            )}

            {/* PayPal button container */}
            {!paypalLoading && (
              <div id="paypal-btn-container" style={{ minHeight: 150 }} />
            )}

            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 8 }}>
              🔒 Sandbox mode — no real money will be charged
            </p>
          </div>
        )}

        {!selectedPlan && (
          <>
            <div className="pricing-policies">
              {POLICIES.map((p) => (
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
