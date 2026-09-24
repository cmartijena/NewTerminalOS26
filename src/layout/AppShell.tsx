import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  // Close the drawer on every navigation — otherwise it stays open behind the new page.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-bg lg:flex-row">
      {/* Mobile-only top bar — the sidebar itself is hidden below the lg breakpoint
          (see Sidebar.tsx) and opens as an overlay drawer from here instead. */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Abrir menú"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-t2 hover:bg-bg"
        >
          <Menu size={20} />
        </button>
        <span className="text-[15px] font-extrabold text-t1">TerminalOS</span>
      </div>

      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
