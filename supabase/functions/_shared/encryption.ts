import { HttpError } from "./http.ts";

const ENCRYPTION_PREFIX = "v1";
const ENCRYPTION_KEY_ENV = "STRIPE_CONNECTIONS_ENCRYPTION_KEY";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

let cachedKey: CryptoKey | null = null;

const normalizeBase64 = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  return padding === 0 ? normalized : `${normalized}${"=".repeat(4 - padding)}`;
};

const base64ToBytes = (value: string): Uint8Array => {
  const decoded = atob(normalizeBase64(value));
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
};

const bytesToBase64 = (value: ArrayBuffer | Uint8Array): string => {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

async function getEncryptionKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const rawKey = Deno.env.get(ENCRYPTION_KEY_ENV);
  if (!rawKey) {
    throw new HttpError(500, `${ENCRYPTION_KEY_ENV} is not configured`);
  }

  const keyBytes = base64ToBytes(rawKey.trim());
  if (keyBytes.byteLength !== 32) {
    throw new HttpError(500, `${ENCRYPTION_KEY_ENV} must decode to exactly 32 bytes`);
  }

  cachedKey = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);

  return cachedKey;
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(`${ENCRYPTION_PREFIX}:`);
}

export async function encryptSecret(plainText: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherText = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder.encode(plainText),
  );

  return `${ENCRYPTION_PREFIX}:${bytesToBase64(iv)}:${bytesToBase64(cipherText)}`;
}

export async function decryptSecret(payload: string): Promise<string> {
  if (!isEncryptedSecret(payload)) {
    throw new HttpError(500, "Secret payload is not encrypted with supported format");
  }

  const [_version, ivBase64, cipherBase64] = payload.split(":");
  if (!ivBase64 || !cipherBase64) {
    throw new HttpError(500, "Encrypted secret payload is malformed");
  }

  const key = await getEncryptionKey();
  const iv = base64ToBytes(ivBase64);
  const cipherBytes = base64ToBytes(cipherBase64);

  try {
    const plainBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      cipherBytes,
    );

    return textDecoder.decode(plainBuffer);
  } catch {
    throw new HttpError(500, "Failed to decrypt Stripe connection secret");
  }
}
