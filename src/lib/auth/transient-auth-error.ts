/** Fallo de red o del servicio de Auth. Una sesión ausente no cuenta. */
export function isTransientAuthError(
  error: { name?: string; status?: number } | null | undefined
): boolean {
  if (!error) return false;
  if (error.name === "AuthRetryableFetchError") return true;
  return typeof error.status === "number" && error.status >= 500;
}
