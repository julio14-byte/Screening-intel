import { NextResponse } from "next/server";
import {
  clearEproCookie,
  eproTokenFromRequest,
  loadEproSession,
  revokeEproSession,
  setEproCookie,
} from "@/lib/epro-app/session";

export async function GET(request: Request) {
  const token = eproTokenFromRequest(request);
  const session = await loadEproSession(token);
  if (!session) {
    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    clearEproCookie(response);
    return response;
  }
  const response = NextResponse.json({
    authenticated: true,
    subject_code: session.subjectCode,
  });
  if (token) setEproCookie(response, token);
  return response;
}

export async function DELETE(request: Request) {
  const token = eproTokenFromRequest(request);
  await revokeEproSession(token);
  const response = NextResponse.json({ ok: true });
  clearEproCookie(response);
  return response;
}
