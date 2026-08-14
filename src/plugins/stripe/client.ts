import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY no configurada.");
  }

  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key);
  }

  return stripeSingleton;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
