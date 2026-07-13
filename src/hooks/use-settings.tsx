import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppSettings = {
  id: number;
  company_name: string;
  company_logo: string | null;
  primary_color: string;
  secondary_color: string;
  welcome_text: string;
  footer_text: string;
};

const DEFAULTS: AppSettings = {
  id: 1,
  company_name: "Tay pack",
  company_logo: null,
  primary_color: "#3b82f6",
  secondary_color: "#ffffff",
  welcome_text: "Welcome",
  footer_text: "© Leave Management System",
};

const SettingsContext = createContext<AppSettings>(DEFAULTS);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return (data as AppSettings) ?? DEFAULTS;
    },
    staleTime: 30_000,
  });

  const settings = useMemo<AppSettings>(() => ({ ...DEFAULTS, ...(data ?? {}) }), [data]);

  // Apply brand colors as CSS variables (best-effort).
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.setProperty("--brand-primary", settings.primary_color);
    document.documentElement.style.setProperty("--brand-secondary", settings.secondary_color);
    if (settings.company_name) document.title = settings.company_name;
  }, [settings.primary_color, settings.secondary_color, settings.company_name]);

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
