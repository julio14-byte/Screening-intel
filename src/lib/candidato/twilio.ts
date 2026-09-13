export function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() ?? "";
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() ?? "";
  const smsFrom = process.env.TWILIO_SMS_FROM?.trim() ?? "";
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM?.trim() ?? "";
  return {
    accountSid,
    authToken,
    smsFrom,
    whatsappFrom,
    smsConfigured: Boolean(accountSid && authToken && smsFrom),
    whatsappApiConfigured: Boolean(accountSid && authToken && whatsappFrom),
  };
}

export async function sendTwilioMessage(input: {
  toE164: string;
  from: string;
  body: string;
  whatsapp: boolean;
}): Promise<{ sid: string }> {
  const cfg = getTwilioConfig();
  if (!cfg.accountSid || !cfg.authToken) {
    throw new Error("Twilio no está configurado (TWILIO_ACCOUNT_SID / AUTH_TOKEN).");
  }

  const to = input.whatsapp ? `whatsapp:${input.toE164}` : input.toE164;
  const from = input.whatsapp
    ? input.from.startsWith("whatsapp:")
      ? input.from
      : `whatsapp:${input.from}`
    : input.from;

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: input.body }),
    }
  );

  const raw = await res.text();
  let json: { sid?: string; message?: string } = {};
  try {
    json = JSON.parse(raw) as { sid?: string; message?: string };
  } catch {
    json = {};
  }

  if (!res.ok || !json.sid) {
    throw new Error(
      json.message?.slice(0, 180) ||
        `Twilio no pudo enviar el mensaje (${res.status}).`
    );
  }

  return { sid: json.sid };
}
