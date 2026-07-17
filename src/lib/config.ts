/**
 * Identidad del producto en variables de configuración (PRD §7):
 * el dominio definitivo está en gestión, así que nombre y dominio
 * se cambian aquí sin refactor.
 */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "sicologia.app";
export const APP_DOMAIN =
  process.env.NEXT_PUBLIC_APP_DOMAIN ?? "sicologia.app";
export const APP_TAGLINE =
  "Plataforma clínica con IA para psicólogos. La IA propone, tú decides.";
