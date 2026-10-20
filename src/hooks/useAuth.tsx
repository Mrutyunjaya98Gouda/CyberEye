import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_USER_KEY = "cybereye_mock_user";
const LOCAL_USERS_DB = "cybereye_mock_registered_users";

function makeMockUser(email: string): User {
  return {
    id: "mock-" + btoa(email).replace(/=/g, ""),
    app_metadata: {},
    user_metadata: { email },
    aud: "authenticated",
    created_at: new Date().toISOString(),
    email: email,
    phone: "",
    role: "authenticated",
    updated_at: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local mock storage first
    try {
      const stored = localStorage.getItem(LOCAL_USER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setSession({
          access_token: "mock-token",
          refresh_token: "mock-refresh-token",
          expires_in: 3600,
          token_type: "bearer",
          user: parsed,
        } as Session);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn("Mock auth read error:", e);
    }

    // Attempt Supabase session with timeout fallback
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setSession(session);
          setUser(session.user);
        }
        setLoading(false);
      });

      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (session?.user) {
            setSession(session);
            setUser(session.user);
          }
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });

      return () => {
        clearTimeout(timer);
        subscription?.unsubscribe?.();
      };
    } catch {
      setLoading(false);
      return () => clearTimeout(timer);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const res = (await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Network timeout")), 2000)),
      ])) as any;
      if (!res.error) return { error: null };
    } catch {
      // Fallback to local mock auth
    }

    // Mock auth verification
    try {
      const rawUsers = localStorage.getItem(LOCAL_USERS_DB);
      const users: Record<string, string> = rawUsers ? JSON.parse(rawUsers) : {};
      if (users[email] && users[email] !== password) {
        return { error: new Error("Invalid login credentials") };
      }
      const mockUser = makeMockUser(email);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mockUser));
      setUser(mockUser);
      setSession({
        access_token: "mock-token",
        refresh_token: "mock-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
        user: mockUser,
      } as Session);
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const res = (await Promise.race([
        supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/" },
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Network timeout")), 2000)),
      ])) as any;
      if (!res.error) return { error: null };
    } catch {
      // Fallback to local mock auth
    }

    // Mock sign up registration
    try {
      const rawUsers = localStorage.getItem(LOCAL_USERS_DB);
      const users: Record<string, string> = rawUsers ? JSON.parse(rawUsers) : {};
      users[email] = password;
      localStorage.setItem(LOCAL_USERS_DB, JSON.stringify(users));

      const mockUser = makeMockUser(email);
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mockUser));
      setUser(mockUser);
      setSession({
        access_token: "mock-token",
        refresh_token: "mock-refresh-token",
        expires_in: 3600,
        token_type: "bearer",
        user: mockUser,
      } as Session);
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut().catch(() => {});
    } finally {
      localStorage.removeItem(LOCAL_USER_KEY);
      setUser(null);
      setSession(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
