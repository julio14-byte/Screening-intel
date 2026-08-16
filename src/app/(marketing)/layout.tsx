import type { ReactNode } from "react";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { MarketingNavbar } from "@/components/layout/MarketingNavbar";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-gradient-to-br from-indigo-950 via-violet-950 to-fuchsia-950 text-white">
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-32 top-0 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute -right-32 top-1/3 h-64 w-64 rounded-full bg-fuchsia-500/15 blur-3xl sm:h-96 sm:w-96" />
      </div>
      <MarketingNavbar />
      <main className="relative z-10 flex-1 w-full">{children}</main>
      <MarketingFooter />
    </div>
  );
}
