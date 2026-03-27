import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '../lib/supabaseClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileUpdatedAt, setProfileUpdatedAt] = useState(null);

  const notifyProfileUpdate = useCallback(() => {
    setProfileUpdatedAt(Date.now());
  }, []);

  useEffect(() => {
    // Initial session check — use getSession() not getUser()
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) fetchUserType(s.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) fetchUserType(s.user.id);
      else {
        setUserType(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserType = async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select('user_type')
      .eq('user_id', userId)
      .single();

    if (!error && data) setUserType(data.user_type);
    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserType(null);
  };

  return (
    <AuthContext.Provider value={{ session, userType, loading, signOut, profileUpdatedAt, notifyProfileUpdate }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
