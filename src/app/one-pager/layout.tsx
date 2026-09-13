import type { ReactNode } from "react";

export default function OnePagerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="one-pager-root min-h-screen bg-slate-100 text-slate-900 print:bg-white">
      {children}
    </div>
  );
}
