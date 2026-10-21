const COMMON = new Set([
  "password",
  "password1",
  "contrasena",
  "contraseña",
  "123456789012",
  "qwertyuiop12",
  "crisvia",
  "screening",
  "admin1234567",
  "letmein12345",
]);

export const PASSWORD_MIN_LENGTH = 12;

/** NIST SP 800-63B: longitud mínima, sin reglas arbitrarias, bloquea claves comunes. */
export function validatePassword(password: string, context: string[] = []): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (password.length > 256) return "La contraseña es demasiado larga.";
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) return "Esa contraseña es demasiado común.";
  if (/^(.)\1+$/.test(password)) return "La contraseña no puede repetir un solo carácter.";
  for (const item of context) {
    const part = item.split("@")[0]?.toLowerCase();
    if (part && part.length >= 4 && lower.includes(part)) {
      return "La contraseña no debe contener tu correo o nombre.";
    }
  }
  return null;
}
