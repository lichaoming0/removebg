import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

const GoogleLoginButton: React.FC = () => {
  const { login, user, logout, isLoggedIn, loading } = useAuth();
  const [loginError, setLoginError] = React.useState('');

  const googleLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (tokenResponse) => {
      setLoginError('');
      try {
        // tokenResponse.code is the authorization code
        await login(tokenResponse.code);
      } catch (err: any) {
        setLoginError(err.message || 'Login failed. Please try again.');
      }
    },
    onError: () => {
      setLoginError('Google sign-in was cancelled or failed.');
    },
  });

  if (loading) {
    return (
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e5e7eb' }} />
    );
  }

  if (isLoggedIn && user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src={user.picture}
          alt={user.name}
          referrerPolicy="no-referrer"
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            border: '2px solid var(--color-border)',
          }}
        />
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            maxWidth: 120,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {user.name}
        </span>
        <button
          onClick={logout}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            fontSize: 12,
            padding: '2px 6px',
          }}
          title="Sign out"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button
        onClick={() => googleLogin()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 18px',
          background: '#fff',
          border: '1px solid var(--color-border)',
          borderRadius: '50px',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--color-text)',
          transition: 'all var(--transition)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Sign in with Google
      </button>
      {loginError && (
        <span style={{ fontSize: 12, color: 'var(--color-error)' }}>{loginError}</span>
      )}
    </div>
  );
};

export default GoogleLoginButton;
