import { Suspense } from "react";
import { getDemoCredentials } from "@/lib/auth/constants";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  const demo = getDemoCredentials();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-900">
          <p className="text-sm text-violet-200">Cargando…</p>
        </div>
      }
    >
      <LoginForm demoEmail={demo.email} demoPassword={demo.password} />
    </Suspense>
  );
}
