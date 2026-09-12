import { Suspense } from "react";
import { getDemoCredentials } from "@/lib/auth/constants";
import { isDemoLoginEnabled } from "@/lib/auth/session-policy";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  const demoEnabled = isDemoLoginEnabled();
  const demo = getDemoCredentials();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-900">
          <p className="text-sm text-violet-200">Cargando…</p>
        </div>
      }
    >
      <LoginForm
        demoEmail={demoEnabled ? demo.email : ""}
        demoPassword={demoEnabled ? demo.password : ""}
        showDemoHint={demoEnabled}
      />
    </Suspense>
  );
}
