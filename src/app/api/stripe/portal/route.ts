import { NextResponse } from "next/server";
import config from "@/config";
import { getUser } from "@/lib/supabase/server";
import {
  createPortalSession,
  StripePortalError,
  isStripeConfigured,
} from "@/plugins/stripe";

export async function POST() {
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

  try {
    const { url } = await createPortalSession(user);
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof StripePortalError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
