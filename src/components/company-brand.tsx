import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";
import { COMPANY } from "@/lib/company";
import { cn } from "@/lib/utils";

export function CompanyBrand({
  className,
  compact = false,
  linkTo,
}: {
  className?: string;
  compact?: boolean;
  linkTo?: string;
}) {
  const inner = (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
        <img src={logo} alt="" width={32} height={32} className="h-8 w-8 object-contain" />
      </div>
      {!compact && (
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold text-foreground">{COMPANY.name}</span>
          <span className="truncate text-xs text-muted-foreground">{COMPANY.appName}</span>
        </div>
      )}
    </div>
  );
  if (linkTo) {
    return (
      <Link to={linkTo} className="outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
        {inner}
      </Link>
    );
  }
  return inner;
}
