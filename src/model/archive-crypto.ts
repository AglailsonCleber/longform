import type { ArchiveFile } from "./archive";
import { safeRelativePath } from "./archive";

export type ArchiveEnvelope = {
  format: "longform-archive-v1";
  kdf: "PBKDF2-SHA-256";
  iterations: number;
  cipher: "AES-GCM";
  salt: string;
  iv: string;
  data: string;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export function filesFromPayload(payload: string): ArchiveFile[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) {
    return null;
  }
  const files: ArchiveFile[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") {
      return null;
    }
    const path = (item as { path?: unknown }).path;
    const text = (item as { text?: unknown }).text;
    if (typeof path !== "string" || typeof text !== "string") {
      return null;
    }
    const safe = safeRelativePath(path);
    if (!safe) {
      return null;
    }
    files.push({ path: safe, text });
  }
  return files;
}

export async function sealArchive(
  files: ArchiveFile[],
  passphrase: string,
  iterations = 100_000
): Promise<ArchiveEnvelope | null> {
  if (passphrase.length === 0) {
    return null;
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, iterations);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(files))
  );
  return {
    format: "longform-archive-v1",
    kdf: "PBKDF2-SHA-256",
    iterations,
    cipher: "AES-GCM",
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(cipher)),
  };
}

export function envelopeFrom(value: unknown): ArchiveEnvelope | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Partial<ArchiveEnvelope>;
  if (
    raw.format !== "longform-archive-v1" ||
    raw.kdf !== "PBKDF2-SHA-256" ||
    raw.cipher !== "AES-GCM" ||
    typeof raw.iterations !== "number" ||
    typeof raw.salt !== "string" ||
    typeof raw.iv !== "string" ||
    typeof raw.data !== "string"
  ) {
    return null;
  }
  return raw as ArchiveEnvelope;
}

export async function openArchive(
  envelope: ArchiveEnvelope,
  passphrase: string
): Promise<ArchiveFile[] | null> {
  if (passphrase.length === 0) {
    return null;
  }
  try {
    const key = await deriveKey(passphrase, base64ToBytes(envelope.salt), envelope.iterations);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(envelope.iv) },
      key,
      base64ToBytes(envelope.data)
    );
    return filesFromPayload(new TextDecoder().decode(plain));
  } catch {
    return null;
  }
}
