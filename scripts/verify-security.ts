import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import nextConfig from "../next.config";
import config from "../src/config";
import { rateLimit } from "../src/lib/security/rate-limit";
import { safeRedirectPath } from "../src/lib/security/safe-redirect";

let failed = 0;

function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

async function main() {
  // Open redirect
  for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "/a\\b", "/\nx"]) {
    assert(safeRedirectPath(bad, "/dashboard") === "/dashboard", `redirect bloqueado: ${JSON.stringify(bad)}`);
  }
  assert(safeRedirectPath("/citas?x=1", "/dashboard") === "/citas?x=1", "ruta interna permitida");
  assert(safeRedirectPath(null, "/dashboard") === "/dashboard", "null usa fallback");

  // Rate limit (memoria; sin service role)
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = `verify:${Date.now()}`;
  const results = [];
  for (let i = 0; i < 4; i++) results.push(await rateLimit(key, 3, 60));
  assert(results.slice(0, 3).every((r) => r.allowed), "rate limit permite hasta el máximo");
  assert(!results[3].allowed && results[3].retryAfterSec > 0, "rate limit bloquea al exceder");

  // Cabeceras de seguridad
  const rules = (await nextConfig.headers?.()) ?? [];
  const all = rules.find((r) => r.source === "/:path*")?.headers ?? [];
  const header = (name: string) => all.find((h) => h.key === name)?.value ?? "";
  const csp = header("Content-Security-Policy");
  assert(csp.includes("frame-ancestors 'none'"), "CSP bloquea framing");
  assert(csp.includes("object-src 'none'"), "CSP sin plugins");
  assert(csp.includes("base-uri 'self'"), "CSP fija base-uri");
  assert(!/script-src[^;]*\*/.test(csp), "CSP sin comodines en script-src");
  assert(header("X-Content-Type-Options") === "nosniff", "nosniff");
  assert(header("X-Frame-Options") === "DENY", "X-Frame-Options");
  assert(header("Strict-Transport-Security").includes("max-age="), "HSTS");
  assert(header("Referrer-Policy") !== "", "Referrer-Policy");
  assert(nextConfig.poweredByHeader === false, "sin X-Powered-By");

  // Toda API no pública exige autenticación o permiso
  const publicApis = config.routes.publicApis;
  const gates = /requireAuth|requirePermission|requireRole|opsContext|getUser\(|auth\.getUser|constructStripeEvent/;
  const routeFiles = walk(resolve("src/app/api")).filter((f) => f.endsWith("route.ts"));
  for (const file of routeFiles) {
    const rel = file
      .slice(resolve("src/app").length)
      .replace(/\\/g, "/")
      .replace(/\/route\.ts$/, "");
    const isPublic = publicApis.some((p) => rel === p || rel.startsWith(`${p}/`));
    if (isPublic) continue;
    assert(gates.test(readFileSync(file, "utf8")), `API sin control de acceso: ${rel}`);
  }

  // Ninguna API devuelve mensajes crudos de Postgres al cliente
  for (const file of routeFiles) {
    const src = readFileSync(file, "utf8");
    assert(
      !/NextResponse\.json\(\s*\{\s*error:\s*\w*[eE]rror\.message/.test(src),
      `mensaje interno expuesto en ${file.slice(resolve("src").length)}`
    );
  }

  // Auditoría: el actor no viene del cliente
  const auditRoute = readFileSync(resolve("src/app/api/audit/route.ts"), "utf8");
  assert(!/payload\.userId/.test(auditRoute), "audit POST no acepta userId del cliente");
  const auditLib = readFileSync(resolve("src/lib/audit/record-audit-event.ts"), "utf8");
  assert(!/createSupabaseAdminClient/.test(auditLib), "auditoría sin fallback service_role");

  // Migraciones clave presentes
  const migrations = readdirSync(resolve("supabase/migrations")).join("\n");
  assert(/security_hardening/.test(migrations), "migración security_hardening");
  assert(/enforce_plan_limits/.test(migrations), "migración enforce_plan_limits");

  if (failed > 0) {
    console.error(`\n${failed} verificación(es) de seguridad fallaron.`);
    process.exit(1);
  }
  console.log("verify-security: OK");
}

void main();
