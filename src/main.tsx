import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './components/App';
import './styles/global.css';

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '974859501286-sa67i61lon92g2d77ap1m2pv5d4memtb.apps.googleusercontent.com';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
