import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/hr/settings")({
  component: SettingsPage,
});

type Settings = {
  id: number;
  company_name: string;
  company_logo: string | null;
  primary_color: string;
  secondary_color: string;
  welcome_text: string;
  footer_text: string;
};

function SettingsPage() {
  const qc = useQueryClient();
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState("#ffffff");
  const [welcomeText, setWelcomeText] = useState("");
  const [footerText, setFooterText] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as Settings | null;
    },
  });

  useEffect(() => {
    if (data) {
      setCompanyName(data.company_name);
      setCompanyLogo(data.company_logo ?? "");
      setPrimaryColor(data.primary_color);
      setSecondaryColor(data.secondary_color);
      setWelcomeText(data.welcome_text);
      setFooterText(data.footer_text ?? "");
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!data) throw new Error("Settings not loaded");
      const { error } = await supabase
        .from("settings")
        .update({
          company_name: companyName,
          company_logo: companyLogo || null,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          welcome_text: welcomeText,
          footer_text: footerText,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["app-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Settings"
        description="Company branding and application preferences."
      />

      {isLoading ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          Loading settings...
        </div>
      ) : (
        <div className="max-w-2xl space-y-6 rounded-xl border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="company-name">Company name</Label>
            <Input
              id="company-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-logo">Company logo URL</Label>
            <Input
              id="company-logo"
              value={companyLogo}
              onChange={(e) => setCompanyLogo(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary">Primary color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="primary"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 p-1"
                />
                <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary">Secondary color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="secondary"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-10 w-14 p-1"
                />
                <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="welcome">Welcome text</Label>
            <Textarea
              id="welcome"
              value={welcomeText}
              onChange={(e) => setWelcomeText(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
