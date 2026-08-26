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
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 border-l-4 border-violet-500 pl-4">
        <h1 className="bg-gradient-to-r from-indigo-900 via-violet-800 to-fuchsia-700 bg-clip-text text-lg font-semibold tracking-tight text-transparent sm:text-xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-indigo-600/80 sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center [&_a]:w-full sm:[&_a]:w-auto [&_button]:w-full sm:[&_button]:w-auto">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
