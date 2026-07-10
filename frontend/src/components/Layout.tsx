import { Link as RouterLink, useLocation } from "react-router-dom";
import { PropsWithChildren } from "react";

export default function Layout({ children }: PropsWithChildren) {
  const location = useLocation();
  const isDashboard = location.pathname === "/";

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <RouterLink to="/" className="flex items-center gap-2 font-semibold text-lg text-slate-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              🔗
            </span>
            LinkPilot
          </RouterLink>
          {!isDashboard && (
            <RouterLink
              to="/"
              className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              ← Back to dashboard
            </RouterLink>
          )}
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        LinkPilot — AI-Powered URL Shortener Dashboard
      </footer>
    </div>
  );
}
