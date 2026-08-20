import { NextResponse } from "next/server";
import { getUserAppRole } from "@/lib/rbac/get-user-role";
import { getUser } from "@/lib/supabase/server";

export async function GET() {
  const user = await getUser();

  if (!user) {
    return NextResponse.json({ authenticated: false });
  }

  const role = await getUserAppRole(user.id);

  return NextResponse.json({
    authenticated: true,
    email: user.email ?? null,
    userId: user.id,
    role,
  });
}
