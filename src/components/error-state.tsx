import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function ErrorState({
  code,
  title,
  message,
}: {
  code: string;
  title: string;
  message: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-accent/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 text-center shadow-[var(--shadow-card)] ring-1 ring-border">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <span className="text-lg font-bold">{code}</span>
        </div>
        <h1 className="mt-5 text-xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link to="/">Go home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
