import { NextResponse } from "next/server";
import { formatIcd11Condition } from "@/lib/icd11/utils";
import { searchIcd11 } from "@/lib/icd11/who-client";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Parámetro q requerido." }, { status: 400 });
  }

  try {
    const rawResults = await searchIcd11(query);
    const names = rawResults.map((result) => formatIcd11Condition(result));
    const results = rawResults.map((result, index) => ({
      ...result,
      title: names[index],
    }));

    return NextResponse.json({ results, names });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error ICD-11";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
