import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "employee" | "manager" | "hr";

export interface AuthProfile {
  id: string;
  employeeCode: string | null;
  email: string;
  fullName: string;
  role: UserRole;
  departmentId: string | null;
  managerId: string | null;
  isActive: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: AuthProfile | null;
  profileMissing: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string, remember: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (u: User | null) => {
    if (!u) {
      setProfile(null);
      setProfileMissing(false);
      return;
    }

    // 1. محاولة جلب البروفايل الحالي للمستخدم
    let { data, error } = await supabase
      .from("profiles")
      .select("id, employee_code, email, full_name, role, department_id, manager_id, is_active")
      .eq("id", u.id)
      .maybeSingle();

    // 2. إذا لم يتم العثور على بروفايل (الحساب جديد تماماً)
    // نقوم بإنشاء بروفايل تلقائي فوراً لفتح الحساب دون اللجوء للـ HR
    if (!data && !error) {
      const fallbackName = u.email?.split("@")[0] || "New User";
      
      const { data: insertedData, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: u.id,
          email: u.email!,
          full_name: fallbackName,
          role: "employee", // يمكنك تغييرها هنا إلى "hr" مؤقتاً لتفعيل كل الصلاحيات في التطبيق
          is_active: true,
          employee_code: "EMP-" + Math.floor(1000 + Math.random() * 9000) // كود عشوائي مؤقت
        })
        .select()
        .single();

      if (!insertError && insertedData) {
        data = insertedData;
      }
    }

    // 3. التحقق الأخير لإرجاع الخطأ إذا فشل البناء تماماً
    if (error || !data) {
      setProfile(null);
      setProfileMissing(true);
      return;
    }

    setProfileMissing(false);
    setProfile({
      id: data.id,
      employeeCode: data.employee_code,
      email: data.email,
      fullName: data.full_name,
      role: data.role as UserRole,
      departmentId: data.department_id,
      managerId: data.manager_id,
      isActive: data.is_active,
    });
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setProfileMissing(false);
      } else {
        void loadProfile(s?.user ?? null);
      }
    });

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      await loadProfile(data.session?.user ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    profile,
    profileMissing,
    loading,
    refreshProfile: () => loadProfile(user),
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
    resetPassword: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
