import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface GoogleUser {
  id: number;
  google_id: string;
  name: string;
  email: string;
  picture: string;
}

interface AuthContextType {
  user: GoogleUser | null;
  accessToken: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  isLoggedIn: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  accessToken: null,
  login: async () => {},
  logout: () => {},
  isLoggedIn: false,
  loading: true,
});

const STORAGE_KEY = 'removebg_session';

function saveSession(token: string, user: GoogleUser) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

function loadSession(): { token: string; user: GoogleUser } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.token || !data.user?.google_id) return null;
    return data;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const session = loadSession();
  const [user, setUser] = useState<GoogleUser | null>(session?.user || null);
  const [accessToken, setAccessToken] = useState<string | null>(session?.token || null);
  const [loading, setLoading] = useState(true);

  // Verify session on mount
  useEffect(() => {
    const session = loadSession();
    if (session?.token) {
      // Verify token is still valid with backend
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${session.token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setUser(data.user);
            setAccessToken(session.token);
            saveSession(session.token, data.user);
          } else {
            clearSession();
            setUser(null);
            setAccessToken(null);
          }
        })
        .catch(() => {
          // Keep cached user on network error
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (token: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: token }),
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        setAccessToken(token);
        saveSession(token, data.user);
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    clearSession();
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout, isLoggedIn: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}
