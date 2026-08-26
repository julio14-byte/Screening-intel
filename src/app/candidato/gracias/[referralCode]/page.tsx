export default async function CandidatoGraciasPage({
  params,
}: {
  params: Promise<{ referralCode: string }>;
}) {
  const { referralCode } = await params;

  return (
    <div className="rounded-xl border border-emerald-100 bg-white p-6 shadow-sm text-center">
      <p className="text-lg font-semibold text-indigo-950">¡Gracias por tu pre-registro!</p>
      <p className="mt-2 text-sm text-indigo-700">
        Tu código de referencia es{" "}
        <strong className="font-mono">{referralCode}</strong>.
      </p>
      <p className="mt-4 text-sm text-indigo-600">
        Un coordinador del centro revisará tu información y te contactará si hace falta
        más información o para coordinar una visita.
      </p>
    </div>
  );
}
