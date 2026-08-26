import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-violet-100/80 bg-white/90 shadow-sm shadow-indigo-100/50 backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-violet-100 bg-gradient-to-r from-indigo-50/50 to-violet-50/30 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-slate-900 break-words">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-slate-500 break-words">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0 self-start">{actions}</div> : null}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("p-4", className)}>{children}</div>;
}
