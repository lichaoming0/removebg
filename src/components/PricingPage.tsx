import React from 'react';

interface Plan {
  name: string;
  price: string;
  period: string;
  images: string;
  pricePerImage: string;
  features: string[];
  highlighted: boolean;
  cta: string;
}

const PLANS: Plan[] = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    images: '1',
    pricePerImage: 'Free',
    highlighted: false,
    cta: 'Get Started',
    features: [
      '1 HD image per month',
      'Only charged on success',
      'Full resolution PNG',
      'All background options',
      'Standard processing',
    ],
  },
  {
    name: 'Starter',
    price: '$5.99',
    period: '/month',
    images: '20',
    pricePerImage: '$0.30',
    highlighted: true,
    cta: 'Subscribe Now',
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
    name: 'Pro',
    price: '$22.99',
    period: '/month',
    images: '80',
    pricePerImage: '$0.29',
    highlighted: false,
    cta: 'Subscribe Now',
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

const PricingPage: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="pricing-overlay">
    <div className="pricing-container">
      <div className="pricing-header">
        <h2>Simple, fair pricing</h2>
        <p>You only pay when it works. No hidden fees, no auto-charge.</p>
        <button className="pricing-close" onClick={onClose}>×</button>
      </div>

      <div className="pricing-grid">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`pricing-card ${plan.highlighted ? 'highlighted' : ''}`}
          >
            {plan.highlighted && <span className="pricing-badge">Most Popular</span>}
            <h3>{plan.name}</h3>
            <div className="pricing-price">
              <span className="price-amount">{plan.price}</span>
              <span className="price-period">{plan.period}</span>
            </div>
            <div className="pricing-images">
              <strong>{plan.images}</strong> images/month
            </div>
            <div className="pricing-per-image">
              {plan.pricePerImage}/image
            </div>
            <ul className="pricing-features">
              {plan.features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            <button
              className={`pricing-cta ${plan.highlighted ? 'primary' : 'secondary'}`}
              onClick={onClose}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>

      <div className="pricing-policies">
        {POLICIES.map((p) => (
          <div key={p.title} className="policy-item">
            <span className="policy-icon">{p.icon}</span>
            <div>
              <strong>{p.title}</strong>
              <p>{p.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="pricing-footer-note">
        Need more than 80 images/month? <a href="mailto:lichaoming0@gmail.com">Contact us</a> for a custom plan.
      </p>
    </div>
  </div>
);

export default PricingPage;
