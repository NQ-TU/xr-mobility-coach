import { Link, useLocation } from "wouter";
import {
  Bot,
  Dumbbell,
  History,
  LayoutDashboard,
  LogOut,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutDashboard, href: "/overview" },
  { label: "Routines", icon: Dumbbell, href: "/routines" },
  { label: "History", icon: History, href: "/history" },
  { label: "AI Coach", icon: Bot, href: "/coach" },
  { label: "Profile", icon: UserCircle, href: "/profile" },
];

// Sidebar component that renders the navigation menu and logout button. It supports both desktop and mobile variants, and highlights the active route. Uses wouter for navigation and AuthContext for logout functionality.
type SidebarProps = {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
};

export function Sidebar({ variant = "desktop", onNavigate }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const { logout } = useAuth();
  const isMobile = variant === "mobile";

  return (
    <aside
      className={cn(
        "w-64 flex flex-col border-r border-border/60 bg-white/70 backdrop-blur-xl",
        isMobile ? "h-full" : "fixed h-screen z-30 hidden lg:flex"
      )}
    >
      <div className="h-16 flex items-center px-6 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Dumbbell className="text-white size-5" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">MobilityXR</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || location.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/5"
              )}
              onClick={() => onNavigate?.()}
            >
              <item.icon
                className={cn(
                  "size-5",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/60">
        <button
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
          type="button"
          onClick={() => {
            logout();
            setLocation("/auth");
            onNavigate?.();
          }}
        >
          <LogOut className="size-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
