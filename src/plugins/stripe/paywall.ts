import config from "@/config";
import { getOrganizationForUser } from "./organization";
import { isSubscriptionActive } from "./plans";

/**
 * Devuelve la URL de redirect del paywall o null si el usuario puede continuar.
 */
export async function getPaywallRedirect(
  userId: string,
  pathname = ""
): Promise<string | null> {
  if (!config.features.payments) return null;

  const isAccountRoute = pathname.startsWith("/account");
  if (isAccountRoute) return null;

  try {
    const organization = await getOrganizationForUser(userId);
    if (organization && !isSubscriptionActive(organization)) {
      return "/account/billing?reason=subscription";
    }
  } catch (err) {
    console.error("[stripe] paywall check failed:", (err as Error)?.message);
  }

  return null;
}
