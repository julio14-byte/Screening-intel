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
    if (body?.planId) planId = body.planId;
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
