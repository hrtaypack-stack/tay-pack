import { useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, User as UserIcon } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CompanyBrand } from "@/components/company-brand";
import type { AuthProfile } from "@/hooks/use-auth";
import { useAuth } from "@/hooks/use-auth";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function toTitle(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function segmentLabel(seg: string) {
  return seg
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function AppHeader({
  profile,
  onToggleSidebar,
}: {
  profile: AuthProfile;
  onToggleSidebar: () => void;
}) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const crumbs = pathname.split("/").filter(Boolean);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        className="lg:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="lg:hidden">
        <CompanyBrand compact />
      </div>

      <nav className="hidden flex-1 items-center gap-2 text-sm text-muted-foreground lg:flex">
        {crumbs.length === 0 ? (
          <span>Home</span>
        ) : (
          crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-muted-foreground/50">/</span>}
              <span
                className={
                  i === crumbs.length - 1 ? "font-medium text-foreground" : ""
                }
              >
                {segmentLabel(c)}
              </span>
            </span>
          ))
        )}
      </nav>
      <div className="flex-1 lg:hidden" />

      <NotificationBell />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-10 gap-3 px-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials(profile.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left leading-tight sm:block">
              <div className="text-sm font-medium">{profile.fullName}</div>
              <div className="text-xs text-muted-foreground">
                {toTitle(profile.role)}
              </div>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="font-medium">{profile.fullName}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">
                {profile.email}
              </span>
              <Badge variant="secondary" className="mt-2 w-fit">
                {toTitle(profile.role)}
              </Badge>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <UserIcon className="mr-2 h-4 w-4" /> Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
