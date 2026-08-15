import Link from "next/link";
import config from "@/config";
import { getUser } from "@/lib/supabase/server";
import { getOrganizationForUser } from "@/plugins/stripe/organization";
import {
  getPlanConfig,
  isSubscriptionActive,
  subscriptionStatusLabel,
} from "@/plugins/stripe/plans";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { BillingPortalButton } from "@/components/billing/BillingPortalButton";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";

export const metadata = {
  title: `Facturación · ${config.app.name}`,
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
        <Link href="/login" className="text-sky-700 hover:underline">
          Inicia sesión
        </Link>{" "}
        para ver tu plan.
      </p>
    );
  }

  const organization = await getOrganizationForUser(user.id);
  const params = await searchParams;
  const reason = params?.reason?.toString();
  const checkout = params?.checkout?.toString();
  const upgrade = params?.upgrade?.toString();

  const plan = getPlanConfig(organization?.plan_id ?? "starter");
  const active = organization ? isSubscriptionActive(organization) : false;
  const paymentsEnabled = config.features.payments;

  return (
    <>
      <PageHeader
        title="Facturación y plan"
        description={`Administra la suscripción de tu research site en ${config.app.name}.`}
      />

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
          Checkout cancelado. Puedes intentar de nuevo cuando quieras.
        </div>
      ) : null}

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-900">Tu research site</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Nombre</dt>
            <dd className="font-medium text-right">{organization?.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Plan</dt>
            <dd className="font-medium">{plan?.name ?? organization?.plan_id}</dd>
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
                {new Date(organization.trial_ends_at).toLocaleDateString("es-AR")}
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Límite pacientes</dt>
            <dd className="tabular-nums">{organization?.patient_limit ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Límite protocolos</dt>
            <dd className="tabular-nums">{organization?.protocol_limit ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Usuarios</dt>
            <dd className="tabular-nums">{organization?.user_limit ?? "—"}</dd>
          </div>
        </dl>

        {paymentsEnabled ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {(organization?.plan_id !== "pro" || upgrade === "pro") && (
              <CheckoutButton planId="pro" label="Suscribirse a Site Pro" />
            )}
            {organization?.stripe_customer_id ? (
              <BillingPortalButton />
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Activa <code className="text-xs">features.payments</code> y configura
            Stripe en las variables de entorno.
          </p>
        )}
      </Card>

      {active ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/dashboard">
            <Button>Ir al tablero</Button>
          </Link>
          <Link href="/patients">
            <Button variant="secondary">Pacientes</Button>
          </Link>
        </div>
      ) : null}

      <Card className="mt-6 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Fase 1 SaaS</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>14 días de prueba en plan Starter (50 pacientes, 3 protocolos).</li>
          <li>Plan Site Pro: hasta 500 pacientes y 50 protocolos activos.</li>
          <li>Cobro mensual vía Stripe; cancela desde el portal de cliente.</li>
        </ul>
      </Card>
    </>
  );
}
