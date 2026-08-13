/**
 * Cliente para la API oficial de la OMS para ICD-11.
 * Docs: https://icd.who.int/icdapi
 */

const TOKEN_URL = "https://icdaccessmanagement.who.int/connect/token";
const API_BASE = "https://id.who.int/icd";

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

function getEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Falta ${name}. Copiá mcp-icd11/.env.example a mcp-icd11/.env y completá tus credenciales WHO.`
    );
  }
  return value;
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: getEnv("ICD11_CLIENT_ID"),
    client_secret: getEnv("ICD11_CLIENT_SECRET"),
    scope: "icdapi_access",
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token WHO ICD-11 (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return tokenCache.accessToken;
}

function getRelease(): string {
  return process.env.ICD11_RELEASE?.trim() || "2024-01";
}

function getLinearization(): string {
  return process.env.ICD11_LINEARIZATION?.trim() || "mms";
}

async function icdFetch(url: string, language = "es"): Promise<any> {
  const token = await getAccessToken();
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Accept-Language": language,
      "API-Version": "v2",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`WHO ICD-11 (${response.status}) ${url}: ${text}`);
  }

  return response.json();
}

function extractLabel(field: unknown): string | undefined {
  if (!field) return undefined;
  if (typeof field === "string") return field;
  if (typeof field === "object" && field !== null && "@value" in field) {
    const value = (field as { "@value"?: string })["@value"];
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

function stripHighlightTags(text: string): string {
  return text.replace(/<\/?em[^>]*>/gi, "");
}

export interface Icd11SearchResult {
  id: string;
  code?: string;
  title: string;
  matchingText?: string;
  score?: number;
}

export async function searchIcd11(
  query: string,
  options: { includeRetired?: boolean } = {}
): Promise<Icd11SearchResult[]> {
  const release = getRelease();
  const linearization = getLinearization();
  const url = new URL(
    `${API_BASE}/release/11/${release}/${linearization}/search`
  );

  url.searchParams.set("q", query);
  url.searchParams.set("useFlexisearch", "true");
  url.searchParams.set("flatResults", "true");
  url.searchParams.set("includeKeywordResult", "true");
  url.searchParams.set("highlightingEnabled", "false");

  if (options.includeRetired) {
    url.searchParams.set("releaseId", release);
  }

  let data: any;
  try {
    data = await icdFetch(url.toString(), "es");
  } catch {
    data = await icdFetch(url.toString(), "en");
  }

  const entities = data.destinationEntities || [];

  return entities.map((entity: any) => ({
    id: entity.id || entity["@id"],
    code: entity.theCode || entity.code,
    title: stripHighlightTags(
      extractLabel(entity.title) || entity.title || "(sin título)"
    ),
    matchingText: entity.matchingPVs?.[0]?.label
      ? stripHighlightTags(String(entity.matchingPVs[0].label))
      : undefined,
    score: entity.score,
  }));
}

export async function getIcd11Entity(idOrUri: string): Promise<Record<string, unknown>> {
  let url: string;

  if (idOrUri.startsWith("http")) {
    url = idOrUri;
  } else {
    const release = getRelease();
    const linearization = getLinearization();
    url = `${API_BASE}/release/11/${release}/${linearization}/codeinfo/${encodeURIComponent(idOrUri)}`;
  }

  let data: any;
  try {
    data = await icdFetch(url, "es");
  } catch {
    data = await icdFetch(url, "en");
  }

  return {
    id: data["@id"] || data.id,
    code: data.code || data.theCode,
    title: extractLabel(data.title),
    definition: extractLabel(data.definition),
    longDefinition: extractLabel(data.longDefinition),
    fullySpecifiedName: extractLabel(data.fullySpecifiedName),
    inclusions: (data.inclusion || []).map((item: any) =>
      extractLabel(item.label)
    ),
    exclusions: (data.exclusion || []).map((item: any) =>
      extractLabel(item.label)
    ),
    parent: data.parent,
    children: data.child,
  };
}
