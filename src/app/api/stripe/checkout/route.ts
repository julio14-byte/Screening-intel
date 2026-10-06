import { NextResponse } from "next/server";
import config from "@/config";
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

  let planId = "pro";
  try {
    const body = (await request.json()) as { planId?: string };
    if (body?.planId === "pro" || body?.planId === "pro_plus") {
      planId = body.planId;
    } else if (body?.planId) {
      return NextResponse.json({ error: "Plan inválido." }, { status: 400 });
    }
  } catch {
    // default pro
  }

  try {
    const { url } = await createCheckoutSession({ user, planId });
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof StripeCheckoutError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
