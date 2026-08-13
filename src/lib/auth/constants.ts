export const SESSION_COOKIE = "si-session";
export const USER_COOKIE = "si-user";

export const DEFAULT_DEMO_EMAIL = "demo@screening.local";
export const DEFAULT_DEMO_PASSWORD = "demo123";

export function getDemoCredentials() {
  return {
    email: process.env.DEMO_LOGIN_EMAIL ?? DEFAULT_DEMO_EMAIL,
    password: process.env.DEMO_LOGIN_PASSWORD ?? DEFAULT_DEMO_PASSWORD,
  };
}
