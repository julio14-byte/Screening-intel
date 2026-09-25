/** Contrato HTTP del módulo IWRS. Screening, EDC y ePRO no tocan sus tablas. */

export const IWRS_MODULE = "iwrs" as const;
export const IWRS_API_VERSION = "1";

export const IWRS_API = {
  catalog: "/api/iwrs",
  config: "/api/iwrs/config",
  arms: "/api/iwrs/arms",
  randomize: "/api/iwrs/randomize",
  unblind: "/api/iwrs/unblind",
  sponsorRegister: "/api/iwrs/sponsor-register",
} as const;

export type IwrsApiPath = (typeof IWRS_API)[keyof typeof IWRS_API];
