import { PageHeader } from "@/components/ui/PageHeader";
import { SecurityMfaPanel } from "@/components/auth/SecurityMfaPanel";

export default async function SecuritySettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const enroll = sp.enroll === "1" || sp.enroll === "true";

  return (
    <>
      <PageHeader title="Seguridad" />
      <SecurityMfaPanel forceEnroll={enroll} />
    </>
  );
}
