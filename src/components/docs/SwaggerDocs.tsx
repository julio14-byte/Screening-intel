"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import config from "@/config";
import { routes } from "@/lib/app/routes";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export function SwaggerDocs() {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
              API Reference
            </p>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
              {config.app.name} — Swagger UI
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              OpenAPI 3.0 · probá endpoints con sesión activa (
              <Link href={routes.login} className="text-violet-600 underline">
                login
              </Link>
              )
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={routes.app.docs}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              ← Docs producto
            </Link>
            <a
              href="/api/openapi"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              openapi.json
            </a>
          </div>
        </div>
      </header>

      <div className="swagger-wrap mx-auto max-w-7xl px-2 py-4 sm:px-4">
        <SwaggerUI
          url="/api/openapi"
          docExpansion="list"
          defaultModelsExpandDepth={1}
          tryItOutEnabled
          persistAuthorization
          filter
        />
      </div>
    </div>
  );
}
