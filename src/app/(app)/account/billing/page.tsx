import Link from "next/link";
import config from "@/config";
import { routes } from "@/lib/app/routes";
import { getUser } from "@/lib/supabase/server";
import { getOrganizationForUser } from "@/plugins/stripe/organization";
import {
  getPlanConfig,
  isSubscriptionActive,
  subscriptionStatusLabel,
} from "@/plugins/stripe/plans";
import { BillingPortalButton } from "@/components/billing/BillingPortalButton";
import { PlanUpgradeCards } from "@/components/settings/PlanUpgradeCards";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";

export const metadata = {
  title: `Facturación y plan · ${config.app.name}`,
};

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getUser();
  if (!user) {
    return (
      <p className="text-sm text-slate-600">
        <Link href={routes.login} className="text-violet-700 hover:underline">
          Inicia sesión
        </Link>{" "}
        para ver tu facturación y plan.
      </p>
    );
  }

  const organization = await getOrganizationForUser(user.id);
  const params = await searchParams;
  const checkout = params?.checkout?.toString();
  const reason = params?.reason?.toString();

  const planId = organization?.plan_id ?? "free";
  const plan = getPlanConfig(planId);
  const active = organization ? isSubscriptionActive(organization) : false;
  const paymentsEnabled = config.features.payments;

  return (
    <div className="pb-8">
      <PageHeader title="Facturación y plan" />

      {reason === "subscription" && !active ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          Tu periodo de prueba terminó o la suscripción no está activa. Elige un
          plan para seguir usando la plataforma.
        </div>
      ) : null}

      {checkout === "success" ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          Pago recibido. Tu plan se actualizará en unos segundos.
        </div>
      ) : null}

      {checkout === "cancel" ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800"
        >
          Checkout cancelado. Puedes intentar el upgrade cuando quieras.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-slate-900">Cuenta</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium break-all sm:text-right">{user.email}</dd>
            </div>
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="text-slate-500">Research site</dt>
              <dd className="font-medium sm:text-right">
                {organization?.name ?? "—"}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-6">
          <h2 className="text-sm font-semibold text-slate-900">Plan activo</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Plan</dt>
              <dd className="font-semibold text-violet-900">
                {plan?.name ?? planId}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Estado</dt>
              <dd>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {subscriptionStatusLabel(organization?.subscription_status)}
                </span>
              </dd>
            </div>
            {organization?.trial_ends_at &&
            organization.subscription_status === "trialing" ? (
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Prueba hasta</dt>
                <dd className="tabular-nums">
                  {new Date(organization.trial_ends_at).toLocaleDateString(
                    "es-AR"
                  )}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Pacientes</dt>
              <dd className="tabular-nums">
                {organization?.patient_limit ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Protocolos</dt>
              <dd className="tabular-nums">
                {organization?.protocol_limit ?? "—"}
              </dd>
            </div>
          </dl>

          {paymentsEnabled && organization?.stripe_customer_id ? (
            <div className="mt-6">
              <BillingPortalButton />
            </div>
          ) : null}
        </Card>
      </div>

      <div className="mt-10 space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Planes disponibles</h2>
        <PlanUpgradeCards
          currentPlanId={planId}
          showCheckout={paymentsEnabled}
        />
      </div>

      <div className="mt-8">
        <Link href={routes.app.dashboard}>
          <Button>Ir al Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
