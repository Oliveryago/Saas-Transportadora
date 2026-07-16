import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { User, Tenant, UserRole } from "../types";
import { logAudit } from "../services/auditLogger";

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  realTenant: Tenant | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isDriver: boolean;
  userRole: UserRole | undefined;
  isImpersonating: boolean;
  impersonatedTenant: Tenant | null;
  impersonateTenant: (tenant: Tenant) => void;
  stopImpersonation: () => void;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [realTenant, setRealTenant] = useState<Tenant | null>(null);
  const [impersonatedTenant, setImpersonatedTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = user?.role === "superadmin" || user?.metadata?.superadmin === true;
  const isAdmin = user?.role === "admin" || isSuperAdmin;
  const isManager = user?.role === "manager" || isAdmin;
  const isDriver = user?.role === "driver";
  const userRole = user?.role;
  const isImpersonating = isSuperAdmin && impersonatedTenant !== null;

  // The active tenant: impersonated tenant takes priority for SuperAdmin
  const tenant = impersonatedTenant ?? realTenant;

  function impersonateTenant(t: Tenant) {
    if (!isSuperAdmin) return;
    setImpersonatedTenant(t);
  }

  function stopImpersonation() {
    setImpersonatedTenant(null);
  }

  useEffect(() => {
    setLoading(true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          try {
            const { data: userData } = await supabase
              .from("users")
              .select("*")
              .eq("id", session.user.id)
              .maybeSingle();

            if (userData) {
              setUser(userData);

              const { data: tenantData } = await supabase
                .from("tenants")
                .select("*")
                .eq("id", userData.tenant_id)
                .maybeSingle();

              if (tenantData) {
                setRealTenant(tenantData);
              }
            }
          } catch (error) {
            console.error("Error loading user data:", error);
          }
        } else {
          setUser(null);
          setRealTenant(null);
          setImpersonatedTenant(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  async function signUp(
    email: string,
    password: string,
    name: string
  ): Promise<void> {
    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email,
        password,
      });

    if (authError) {
      console.error("Supabase SignUp Error:", authError);
      throw authError;
    }
    if (!authData.user) throw new Error("Sign up failed: User creation returned no data");

    const newTenantId = crypto.randomUUID();

    const tenantRes = await supabase
      .from("tenants")
      .insert([{ id: newTenantId, name: "Pessoal" }]);

    if (tenantRes.error) throw tenantRes.error;

    const userRes = await supabase
      .from("users")
      .insert([
        {
          id: authData.user.id,
          email,
          name,
          tenant_id: newTenantId,
          role: "admin",
          metadata: {},
        },
      ]);

    if (userRes.error) throw userRes.error;

    const newTenant = { id: newTenantId, name: "Pessoal" } as any;
    const newUser = { id: authData.user.id, email, name, tenant_id: newTenantId, role: "admin", metadata: {} } as any;

    setUser(newUser);
    setRealTenant(newTenant);
  }

  async function signIn(email: string, password: string): Promise<void> {
    try {
      await supabase.auth.signInWithPassword({ email, password });

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        logAudit({ action: "LOGIN", userId: session.user.id });
      }
    } catch (error: any) {
      throw error;
    }
  }

  async function signOut(): Promise<void> {
    if (user) {
      logAudit({ action: "LOGOUT", userId: user.id, tenantId: user.tenant_id });
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setRealTenant(null);
    setImpersonatedTenant(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        realTenant,
        loading,
        isSuperAdmin,
        isAdmin,
        isManager,
        isDriver,
        userRole,
        isImpersonating,
        impersonatedTenant,
        impersonateTenant,
        stopImpersonation,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
