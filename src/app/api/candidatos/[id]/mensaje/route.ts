import { NextResponse } from "next/server";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/rbac/require-permission";
import {
  listOutreach,
  outreachChannels,
  outreachPostSchema,
  sendCandidatoOutreach,
} from "@/lib/candidato/outreach";
import { maskPhone } from "@/lib/candidato/phone";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function authError(e: unknown) {
  if (e instanceof AuthorizationError) {
    const status = e.code === "UNAUTHENTICATED" ? 401 : 403;
    return NextResponse.json({ error: e.message }, { status });
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission("patients:read");
  } catch (e) {
    const denied = authError(e);
    if (denied) return denied;
    throw e;
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  try {
    const messages = await listOutreach(id);
    return NextResponse.json({
      channels: outreachChannels(),
      messages: messages.map((m) => ({
        ...m,
        to_e164: maskPhone(m.to_e164),
      })),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Error al listar mensajes.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await requirePermission("patients:write");
  } catch (e) {
    const denied = authError(e);
    if (denied) return denied;
    throw e;
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = outreachPostSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Elige plantilla y canal (sms, whatsapp o whatsapp_link)." },
      { status: 400 }
    );
  }

  try {
    const result = await sendCandidatoOutreach({
      userId: ctx.user.id,
      submissionId: id,
      template: parsed.data.template,
      channel: parsed.data.channel,
    });
    return NextResponse.json({
      message: {
        ...result.message,
        to_e164: maskPhone(result.message.to_e164),
      },
      preview: result.preview,
      waLink: result.waLink,
      channels: outreachChannels(),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error al enviar el mensaje.";
    const status = /no encontrado/i.test(message)
      ? 404
      : /configurado|teléfono|Twilio|plantilla|slug|Incluye código|inválido/i.test(
            message
          )
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
