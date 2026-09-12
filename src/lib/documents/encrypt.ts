import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = 0x01;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export type DocumentEncryption = "aes-256-gcm" | "storage_at_rest";

function parseKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  const buf = Buffer.from(trimmed, "base64");
  if (buf.length !== KEY_LENGTH) {
    throw new Error(
      "DOCUMENT_ENCRYPTION_KEY debe ser 32 bytes (64 hex o base64)."
    );
  }
  return buf;
}

/** Clave de aplicación. En production es obligatoria; en dev se puede omitir. */
export function getDocumentEncryptionKey(): Buffer | null {
  const raw = process.env.DOCUMENT_ENCRYPTION_KEY?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DOCUMENT_ENCRYPTION_KEY no configurada.");
    }
    return null;
  }
  return parseKey(raw);
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Empaqueta version || iv || ciphertext || tag. */
export function encryptDocumentBytes(plain: Uint8Array, key: Buffer): Buffer {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([VERSION]), iv, ciphertext, tag]);
}

export function decryptDocumentBytes(packed: Uint8Array, key: Buffer): Buffer {
  if (packed.byteLength < 1 + IV_LENGTH + TAG_LENGTH) {
    throw new Error("Archivo cifrado inválido.");
  }
  const version = packed[0];
  if (version !== VERSION) {
    throw new Error("Versión de cifrado no soportada.");
  }
  const iv = packed.subarray(1, 1 + IV_LENGTH);
  const tag = packed.subarray(packed.byteLength - TAG_LENGTH);
  const ciphertext = packed.subarray(1 + IV_LENGTH, packed.byteLength - TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
