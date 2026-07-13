import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, Lock, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { CompanyBrand } from "@/components/company-brand";
import { COMPANY } from "@/lib/company";
import { FullscreenLoader } from "@/components/loaders";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in — Leave Management System" },
      {
        name: "description",
        content:
          "Sign in to your Leave Management System account to submit time-off requests, review approvals, and manage team leave.",
      },
      { property: "og:title", content: "Sign in — Leave Management System" },
      {
        property: "og:description",
        content:
          "Sign in to your Leave Management System account to submit time-off requests, review approvals, and manage team leave.",
      },
      { property: "og:url", content: "https://tay-pack.lovable.app/auth" },
    ],
    links: [{ rel: "canonical", href: "https://tay-pack.lovable.app/auth" }],
  }),
});


function AuthPage() {
  const { loading, profile } = useAuth();
  if (loading) return <FullscreenLoader />;
  if (profile) return <Navigate to="/" replace />;
  return <AuthLayout />;
}

function AuthLayout() {
  const [mode, setMode] = useState<"login" | "forgot">("login");
  return (
    <main className="grid min-h-screen bg-accent/30 lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary/90 via-primary to-primary/70 p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <CompanyBrand />
        <div className="max-w-md space-y-4">
          <p className="text-4xl font-semibold leading-tight">
            Welcome to Tay Pack Leave Management.
          </p>
          <p className="text-primary-foreground/80">
            The official leave management platform for Tay Pack employees.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/70">
          © {new Date().getFullYear()} {COMPANY.name}. All rights reserved.
        </p>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <CompanyBrand />
          </div>
          {mode === "login" ? (
            <LoginForm onForgot={() => setMode("forgot")} />
          ) : (
            <ForgotForm onBack={() => setMode("login")} />
          )}
        </div>
      </div>
    </main>
  );
}


function LoginForm({ onForgot }: { onForgot: () => void }) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password, remember);
      toast.success("Welcome back");
      navigate({ to: "/", replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-card p-8 shadow-[var(--shadow-card)] ring-1 ring-border">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your credentials to access your dashboard.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={remember}
              onCheckedChange={(v) => setRemember(v === true)}
            />
            Remember me
          </label>
          <button
            type="button"
            onClick={onForgot}
            className="text-sm font-medium text-primary hover:underline"
          >
            Forgot password?
          </button>
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Accounts are provisioned by your administrator.
      </p>
    </div>
  );
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await resetPassword(email);
      setSent(true);
      toast.success("Password reset email sent");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to send email";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl bg-card p-8 shadow-[var(--shadow-card)] ring-1 ring-border">
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </button>
      <h1 className="text-2xl font-semibold">Forgot password</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        We'll email you a link to reset your password.
      </p>

      {sent ? (
        <div className="mt-6 rounded-lg bg-accent p-4 text-sm text-foreground">
          If an account exists for <span className="font-medium">{email}</span>, a reset link
          is on its way.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send reset link
          </Button>
        </form>
      )}
    </div>
  );
}
