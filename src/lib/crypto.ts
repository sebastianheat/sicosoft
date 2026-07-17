/**
 * Cifrado de API keys BYOK (PRD §3.1): AES-256-GCM con clave derivada
 * por tenant (HKDF sobre APP_ENCRYPTION_KEY + id del profesional).
 * Las keys nunca se loguean ni se devuelven al cliente en texto plano.
 */
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "crypto";

function claveTenant(tenantId: string): Buffer {
  const master = process.env.APP_ENCRYPTION_KEY;
  if (!master) throw new Error("APP_ENCRYPTION_KEY no está configurada");
  return Buffer.from(
    hkdfSync("sha256", Buffer.from(master, "utf8"), Buffer.from(tenantId), "byok", 32)
  );
}

export function cifrar(textoPlano: string, tenantId: string): string {
  const key = claveTenant(tenantId);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const cifrado = Buffer.concat([cipher.update(textoPlano, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), cifrado.toString("base64")].join(".");
}

export function descifrar(payload: string, tenantId: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  const key = claveTenant(tenantId);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Muestra solo los últimos 4 caracteres de una key para la UI. */
export function enmascarar(key: string): string {
  return `••••${key.slice(-4)}`;
}
