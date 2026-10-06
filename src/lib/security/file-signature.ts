export function hasPdfSignature(buffer: ArrayBuffer): boolean {
  const head = new Uint8Array(buffer.slice(0, 1024));
  const text = String.fromCharCode(...head);
  return text.includes("%PDF-");
}

/** Texto plano: rechaza binarios (bytes NUL) renombrados como .txt. */
export function looksLikeText(buffer: ArrayBuffer): boolean {
  const head = new Uint8Array(buffer.slice(0, 4096));
  return !head.includes(0);
}
