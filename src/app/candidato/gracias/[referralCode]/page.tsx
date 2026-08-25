import { getServiceSupabase } from "@/lib/screening-services";

export default async function CandidatoGraciasPage({
  params,
}: {
  params: Promise<{ referralCode: string }>;
}) {
  const { referralCode } = await params;
  const supabase = getServiceSupabase();

  const { data } = await supabase
    .from("pre_screen_submissions")
    .select("referral_code, first_name")
    .eq("referral_code", referralCode)
    .maybeSingle();

  return (
    <div className="rounded-xl border border-emerald-100 bg-white p-6 shadow-sm text-center">
      <p className="text-lg font-semibold text-indigo-950">¡Gracias por tu pre-registro!</p>
      {data ? (
        <p className="mt-2 text-sm text-indigo-700">
          {data.first_name}, tu código de referencia es{" "}
          <strong className="font-mono">{data.referral_code}</strong>.
        </p>
      ) : (
        <p className="mt-2 text-sm text-indigo-700">
          Código: <strong className="font-mono">{referralCode}</strong>
        </p>
      )}
      <p className="mt-4 text-sm text-indigo-600">
        Un coordinador del centro revisará tu información y te contactará si hace falta
        más información o para coordinar una visita.
      </p>
    </div>
  );
}
