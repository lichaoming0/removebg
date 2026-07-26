import React from 'react';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss, onRetry }) => (
  <div className="error-banner">
    <span>⚠ {message}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {onRetry && (
        <button className="error-banner-retry" onClick={onRetry}>
          Retry
        </button>
      )}
      {onDismiss && (
        <button className="error-banner-dismiss" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  </div>
);

export default ErrorBanner;
