import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="border-l-4 border-violet-500 pl-4">
        <h1 className="bg-gradient-to-r from-indigo-900 via-violet-800 to-fuchsia-700 bg-clip-text text-xl font-semibold tracking-tight text-transparent">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-indigo-600/80">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
