/** Evita JSON.parse sobre cuerpos vacíos (502/HTML en Vercel, redirects, etc.). */
export async function readJsonResponse<T>(
  response: Response
): Promise<T | null> {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
