import { NoticeList } from "@/components/ops/Notices";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AvisosPage() {
  return (
    <>
      <PageHeader title="Avisos" />
      <NoticeList />
    </>
  );
}
