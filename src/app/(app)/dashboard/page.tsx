import { SiteFunnelBoard } from "@/components/dashboard/SiteFunnelBoard";
import { loadSiteFunnel } from "@/lib/dashboard/loadSiteFunnel";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const snapshot = await loadSiteFunnel();
  return <SiteFunnelBoard snapshot={snapshot} />;
}
