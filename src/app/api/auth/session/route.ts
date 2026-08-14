import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";

export async function GET() {
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    email: user.email ?? null,
  });
}
