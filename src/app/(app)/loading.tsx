import { LoadingState } from "@/components/ui/StateMessage";

export default function AppLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8">
      <LoadingState label="Cargando módulo…" />
    </div>
  );
}
