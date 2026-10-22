import { NextResponse } from "next/server";
import config from "@/config";
import { parseCheckoutRequest } from "@/lib/billing/interval";
import { getUser } from "@/lib/supabase/server";
import {
  createCheckoutSession,
  StripeCheckoutError,
  isStripeConfigured,
} from "@/plugins/stripe";

export async function POST(request: Request) {
  if (!config.features.payments || !isStripeConfigured()) {
    return NextResponse.json(
      { error: "Los pagos no están configurados." },
      { status: 503 }
    );
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  let planId: "pro" | "pro_plus" = "pro";
  let interval: "month" | "year" = "month";
  try {
    const body = (await request.json()) as { planId?: unknown; interval?: unknown };
    const parsed = parseCheckoutRequest(body ?? {});
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    planId = parsed.planId;
    interval = parsed.interval;
  } catch {
    // sin cuerpo: Pro mensual
  }

  try {
    const { url } = await createCheckoutSession({ user, planId, interval });
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof StripeCheckoutError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
