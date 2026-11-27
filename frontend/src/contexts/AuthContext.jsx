import { createContext, useContext, useEffect, useState } from "react";
import { api, getStoredSession, setStoredSession } from "@/lib/api";

const AuthContext = createContext({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  refreshSession: async () => {},
  setSession: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(() => getStoredSession());
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const res = await api.auth.getSession();
      setSession(res.session || null);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const signOut = async () => {
    try {
      await api.auth.logout();
    } finally {
      setSession(null);
      setStoredSession(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signOut,
        refreshSession,
        setSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
