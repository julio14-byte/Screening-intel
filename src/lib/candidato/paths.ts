import config from "@/config";

/** Rutas públicas del portal de candidatos (español). */
export const candidatoPaths = {
  hub: "/candidato",
  gracias: (referralCode: string) =>
    `/candidato/gracias/${encodeURIComponent(referralCode)}`,
  site: (orgSlug: string) =>
    `/candidato/${encodeURIComponent(orgSlug)}`,
  protocol: (orgSlug: string, protocolCode: string) =>
    `/candidato/${encodeURIComponent(orgSlug)}/${encodeURIComponent(protocolCode)}`,
};

export function buildPortalPublicUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    config.app.defaultUrl;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function portalLinksForOrg(
  orgSlug: string,
  protocols: { code_name: string }[]
) {
  const siteUrl = buildPortalPublicUrl(candidatoPaths.site(orgSlug));
  const protocolLinks = protocols.map((p) => ({
    code: p.code_name,
    url: buildPortalPublicUrl(candidatoPaths.protocol(orgSlug, p.code_name)),
  }));
  return { siteUrl, protocolLinks };
}
