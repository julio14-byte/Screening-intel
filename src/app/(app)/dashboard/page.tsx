import { ScreeningFunnelDashboard } from "@/components/dashboard/ScreeningFunnelDashboard";
import config from "@/config";
import {
  canViewProductMetrics,
  getProductMetrics,
} from "@/lib/dashboard/productMetrics";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getUser();
  let productMetrics = null;
  let productMetricsError: string | null = null;
  let showProductMetrics = false;

  if (user && config.productMetrics?.enabled && canViewProductMetrics(user)) {
    showProductMetrics = true;
    const result = await getProductMetrics();
    if ("error" in result) {
      productMetricsError = result.error;
    } else {
      productMetrics = result;
    }
  }

  return (
    <ScreeningFunnelDashboard
      productMetrics={productMetrics}
      productMetricsError={productMetricsError}
      showProductMetrics={showProductMetrics}
    />
  );
}
