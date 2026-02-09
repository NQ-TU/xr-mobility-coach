import { useState } from "react";
import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-transparent">
      <Sidebar />
      <Header onMenuClick={() => setMobileOpen((open) => !open)} />
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden">
            <Sidebar variant="mobile" onNavigate={() => setMobileOpen(false)} />
          </div>
        </>
      )}
      <main className="lg:pl-64 pt-16 min-h-screen transition-all duration-300">
        <div className="max-w-7xl mx-auto p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">{children}</div>
      </main>
    </div>
  );
}
