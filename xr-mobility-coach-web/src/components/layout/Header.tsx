import { Menu } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/auth-context";

// Helper function to generate user initials for display in the header. It uses first name, last name, or email to create a 1-2 character initials string.
function getUserInitials(firstName?: string | null, lastName?: string | null, email?: string | null) {
  const first = firstName?.trim();
  const last = lastName?.trim();
  if (first || last) {
    const initials = `${first?.[0] ?? ""}${last?.[0] ?? ""}`.trim();
    if (initials) return initials.toUpperCase();
    return (first ?? "U").slice(0, 2).toUpperCase();
  }
  if (!email) return "U";
  const name = email.split("@")[0] || "U";
  const parts = name.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// Header component that displays user information and provides navigation to the profile page. It uses the AuthContext to get user and profile data, and wouter for navigation.
type HeaderProps = {
  onMenuClick?: () => void;
};

export function Header({ onMenuClick }: HeaderProps) {
  const { user, profile } = useAuth();
  const [, setLocation] = useLocation();
  const displayName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() ||
    user?.email ||
    "User";
  const initials = getUserInitials(profile?.firstName, profile?.lastName, user?.email);

  return (
    <header className="h-16 fixed top-0 right-0 left-0 lg:left-64 z-20 px-6 flex items-center justify-between border-b border-border/60 bg-white/70 backdrop-blur-xl">
      <div className="flex-1 flex items-center gap-3">
        <button
          type="button"
          className="lg:hidden inline-flex items-center justify-center size-9 rounded-full hover:bg-black/5 transition-colors"
          onClick={() => onMenuClick?.()}
          aria-label="Open navigation"
        >
          <Menu className="size-5 text-muted-foreground" />
        </button>
        <div className="text-sm">
          <p className="font-semibold leading-none text-muted-foreground">Author: Noel McCarthy</p>
          <p className="text-xs text-muted-foreground mt-1">
            Final Year Project - BSc (Hons) Computer Science - TU Dublin - 2025-2026
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-8 w-px bg-border/60 mx-1"></div>

        <button
          type="button"
          onClick={() => setLocation("/profile")}
          className="flex items-center gap-3 rounded-full px-2 py-1 hover:bg-black/5 transition-colors"
          aria-label="Open profile"
        >
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium leading-none">{displayName}</p>
          </div>
          <div className="size-9 rounded-full bg-primary/10 text-primary grid place-items-center ring-2 ring-white shadow-sm text-sm font-semibold">
            {initials}
          </div>
        </button>
      </div>
    </header>
  );
}

