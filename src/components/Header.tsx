import React from 'react';
import GoogleLoginButton from './GoogleLoginButton';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  title?: string;
  onPricing?: () => void;
}

const LogoSvg = () => (
  <svg
    className="header-logo-svg"
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="64" y2="64">
        <stop offset="0%" stopColor="#7c3aed" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
      <linearGradient id="cloudGrad" x1="0" y1="0" x2="0" y2="20">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#e8ecf4" stopOpacity="0.9" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#logoGrad)" opacity="0.12" />
    <circle cx="32" cy="32" r="26" fill="url(#logoGrad)" opacity="0.08" />
    <path
      d="M20 42c-4.418 0-8-3.582-8-8 0-3.538 2.303-6.482 5.438-7.562C18.152 22.37 21.733 20 26 20c2.916 0 5.528 1.205 7.375 3.125C34.475 22.420 35.685 22 37 22c3.314 0 6 2.686 6 6 0 .339-.028.672-.082.998C45.893 29.778 48 32.39 48 35.5c0 3.59-2.91 6.5-6.5 6.5H20z"
      fill="url(#cloudGrad)"
      stroke="url(#logoGrad)"
      strokeWidth="1.5"
    />
    <rect x="24" y="26" width="16" height="12" rx="2" fill="url(#logoGrad)" opacity="0.85" />
    <circle cx="29" cy="30" r="2" fill="#fff" opacity="0.9" />
    <path d="M24 35l4-4 3 3 5-6 4 7H24z" fill="#fff" opacity="0.7" />
    <circle cx="50" cy="18" r="2" fill="#7c3aed" opacity="0.5" />
    <circle cx="14" cy="20" r="1.5" fill="#3b82f6" opacity="0.4" />
    <circle cx="52" cy="38" r="1" fill="#a78bfa" opacity="0.5" />
  </svg>
);

const Header: React.FC<HeaderProps> = ({ title = 'Image Background Remover', onPricing }) => {
  const { credits, isLoggedIn } = useAuth();
  return (
  <header className="header">
    <div className="header-left">
      <LogoSvg />
      <h1 className="header-title">{title}</h1>
    </div>
    <div className="header-right" style={{ gap: 16 }}>
      {isLoggedIn && (
        <span className="header-credits" title={`${credits} credits remaining`}>
          🪙 {credits}
        </span>
      )}
      {onPricing && (
        <button onClick={onPricing} className="header-pricing-link">Pricing</button>
      )}
      <GoogleLoginButton />
    </div>
  </header>
)};

export default Header;
