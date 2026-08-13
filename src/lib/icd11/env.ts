import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Carga credenciales ICD-11 desde .env.local, .env o mcp-icd11/.env. */
export function loadIcd11Env(cwd = process.cwd()): void {
  for (const file of [".env.local", ".env", "mcp-icd11/.env"]) {
    const path = resolve(cwd, file);
    if (!existsSync(path)) continue;

    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  }
}
