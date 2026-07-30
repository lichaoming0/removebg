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
    images: '5',
    pricePerImage: 'Free',
    highlighted: false,
    cta: 'Get Started',
    features: [
      '5 HD images per month',
      'Full resolution PNG output',
      'Transparent & solid backgrounds',
      'Drag & drop upload',
      'Standard support',
    ],
  },
  {
    name: 'Starter',
    price: '$12',
    period: '/month',
    images: '50',
    pricePerImage: '$0.24',
    highlighted: true,
    cta: 'Subscribe Now',
    features: [
      '50 HD images per month',
      'Full resolution PNG output',
      'All background options',
      'Priority processing',
      'Email support',
      'No watermark',
    ],
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    images: '200',
    pricePerImage: '$0.15',
    highlighted: false,
    cta: 'Subscribe Now',
    features: [
      '200 HD images per month',
      'Full resolution PNG output',
      'All background options',
      'Fastest processing queue',
      'Priority email support',
      'API access (coming soon)',
    ],
  },
  {
    name: 'Business',
    price: '$59',
    period: '/month',
    images: '500',
    pricePerImage: '$0.12',
    highlighted: false,
    cta: 'Contact Us',
    features: [
      '500 HD images per month',
      'Full resolution PNG output',
      'All background options',
      'Dedicated support',
      'API access (coming soon)',
      'Volume discount',
      'Custom integration help',
    ],
  },
];

const PricingPage: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="pricing-overlay">
    <div className="pricing-container">
      <div className="pricing-header">
        <h2>Simple, transparent pricing</h2>
        <p>Powered by remove.bg AI engine. Cancel anytime.</p>
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

      <p className="pricing-footer-note">
        Need more? <a href="mailto:lichaoming0@gmail.com">Contact us</a> for enterprise pricing.
      </p>
    </div>
  </div>
);

export default PricingPage;
