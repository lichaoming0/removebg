import React, { createContext, useContext, useState, useCallback } from 'react';

interface GoogleUser {
  id: number;
  google_id: string;
  name: string;
  email: string;
  picture: string;
  credits: number;
}

interface AuthContextType {
  user: GoogleUser | null;
  login: (code: string) => Promise<void>;
  logout: () => void;
  isLoggedIn: boolean;
  loading: boolean;
  credits: number;
  addCredits: (amount: number) => void;
  syncCredits: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: () => {},
  isLoggedIn: false,
  loading: true,
  credits: 0,
  addCredits: () => {},
  syncCredits: async () => {},
});

const USER_STORAGE_KEY = 'removebg_user';
const CREDITS_STORAGE_KEY = 'removebg_credits';

function saveUser(user: GoogleUser) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

function clearUser() {
  localStorage.removeItem(USER_STORAGE_KEY);
}

function loadUser(): GoogleUser | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as GoogleUser;
    if (!user.email) return null;
    return user;
  } catch {
    return null;
  }
}

function loadCredits(): number {
  return parseInt(localStorage.getItem(CREDITS_STORAGE_KEY) || '0', 10) || 0;
}

function saveCredits(credits: number) {
  localStorage.setItem(CREDITS_STORAGE_KEY, String(credits));
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<GoogleUser | null>(loadUser);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(loadCredits);

  const login = useCallback(async (code: string) => {
    setLoading(true);
    try {
      // Google GIS initCodeClient default redirect_uri = origin + pathname (no query/hash)
      const origin = window.location.origin;
      const pathname = window.location.pathname;
      const fullUri = (origin + pathname).replace(/\/$/, '') || origin;

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirect_uri: origin, full_uri: fullUri }),
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        saveUser(data.user);
        // Sync credits from server
        const serverCredits = data.user.credits || 0;
        setCredits(serverCredits);
        saveCredits(serverCredits);
      } else {
        throw new Error(data.detail || data.error || 'Login failed');
      }
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    clearUser();
  }, []);

  const addCredits = useCallback((amount: number) => {
    setCredits((prev) => {
      const next = prev + amount;
      saveCredits(next);
      return next;
    });
  }, []);

  const syncCredits = useCallback(async () => {
    const u = loadUser();
    if (!u) return;
    try {
      const res = await fetch(`/api/auth/me?google_id=${encodeURIComponent(u.google_id)}`);
      const data = await res.json();
      if (data.user && typeof data.user.credits === 'number') {
        setCredits(data.user.credits);
        saveCredits(data.user.credits);
        // Also update the stored user object
        const updated = { ...u, credits: data.user.credits };
        saveUser(updated);
        setUser(updated);
      }
    } catch {
      // silently fail — use cached credits
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoggedIn: !!user, loading, credits, addCredits, syncCredits }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}
