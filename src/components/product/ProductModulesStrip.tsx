import Link from "next/link";
import { PRODUCT_MODULES, PRODUCT_MODULE_IDS } from "@/lib/product/modules";

export function ProductModulesStrip() {
  return (
    <ul className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {PRODUCT_MODULE_IDS.map((id) => {
        const mod = PRODUCT_MODULES[id];
        return (
          <li key={id}>
            <Link
              href={mod.href}
              className="block h-full rounded-xl border border-violet-100 bg-white/90 p-3 shadow-sm shadow-indigo-100/40 hover:border-violet-300"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                {mod.label}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{mod.summary}</p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
