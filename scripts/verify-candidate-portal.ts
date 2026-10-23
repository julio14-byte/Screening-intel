import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CANDIDATE_INTAKE_ACK,
  CANDIDATE_PORTAL_CLOSED_MESSAGE,
  isCandidatePortalEnabled,
} from "../src/lib/candidato/availability";
import { clientIp } from "../src/lib/security/rate-limit";

let failed = 0;
function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

const previous = process.env.CANDIDATE_PORTAL_ENABLED;
delete process.env.CANDIDATE_PORTAL_ENABLED;
assert(!isCandidatePortalEnabled(), "sin variable el portal está apagado");
process.env.CANDIDATE_PORTAL_ENABLED = "false";
assert(!isCandidatePortalEnabled(), "false lo deja apagado");
process.env.CANDIDATE_PORTAL_ENABLED = "true";
assert(isCandidatePortalEnabled(), "true lo enciende");
if (previous === undefined) delete process.env.CANDIDATE_PORTAL_ENABLED;
else process.env.CANDIDATE_PORTAL_ENABLED = previous;

assert(
  !CANDIDATE_INTAKE_ACK.toLowerCase().includes("califica") &&
    !CANDIDATE_INTAKE_ACK.toLowerCase().includes("elegib"),
  "el acuse público no dice si la persona califica"
);
assert(CANDIDATE_PORTAL_CLOSED_MESSAGE.length > 10, "hay mensaje de portal cerrado");

const forged = new Request("http://localhost/api/candidato/enviar", {
  headers: {
    "x-forwarded-for": "203.0.113.8",
    "x-real-ip": "203.0.113.9",
    "x-vercel-forwarded-for": "198.51.100.10, 203.0.113.1",
  },
});
assert(
  clientIp(forged, { production: true }) === "198.51.100.10",
  "en producción cuenta la IP de la plataforma"
);
const spoofed = new Request("http://localhost/api/candidato/enviar", {
  headers: { "x-forwarded-for": "203.0.113.8", "x-real-ip": "203.0.113.9" },
});
assert(
  clientIp(spoofed, { production: true }) === "unknown",
  "sin cabecera de plataforma no se usa la IP que manda el visitante"
);
assert(clientIp(spoofed, { production: false }) === "local", "en local hay un cupo fijo");

const enviar = readFileSync(resolve("src/app/api/candidato/enviar/route.ts"), "utf8");
assert(enviar.includes("isCandidatePortalEnabled"), "el envío respeta el interruptor");
assert(!enviar.includes("verdict: primaryVerdict"), "la respuesta pública no lleva el veredicto");
assert(enviar.includes("CANDIDATE_INTAKE_ACK"), "el acuse es neutro");
assert(
  readFileSync(resolve("src/app/api/candidato/config/route.ts"), "utf8").includes(
    "isCandidatePortalEnabled"
  ),
  "la configuración pública también está apagada"
);
assert(
  readFileSync(resolve(".github/workflows/security.yml"), "utf8").includes("postgres:17"),
  "CI usa Postgres 17"
);

if (failed > 0) {
  console.error(`verify-candidate-portal: ${failed} fallo(s)`);
  process.exit(1);
}
console.log("verify-candidate-portal: portal apagado, acuse sin elegibilidad e IP de plataforma OK");
