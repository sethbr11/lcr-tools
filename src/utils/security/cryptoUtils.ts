import { browser } from 'wxt/browser';
import { Constants, Regex, Types } from '@/types';

/** Ephemeral in-memory session PIN cache for current execution context. */
let volatileSessionPin: string | null = null;

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Validates whether a PIN string conforms to required numeric format and length.
 *
 * @param pin - Candidate PIN string to evaluate.
 * @returns True when the PIN satisfies format requirements.
 */
export function validatePinFormat(pin: string): boolean {
  if (!pin) return false;
  return Regex.PIN_FORMAT.test(pin.trim());
}

/**
 * Type-guard checking whether an arbitrary value matches the encrypted envelope schema.
 *
 * @param value - Candidate value from storage or memory.
 * @returns True when the object is a valid EncryptedPayload envelope.
 */
export function isEncryptedPayload(value: unknown): value is Types.EncryptedPayload {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.version === 'number' &&
    typeof candidate.salt === 'string' &&
    typeof candidate.iv === 'string' &&
    typeof candidate.ciphertext === 'string'
  );
}

/**
 * Derives an AES-256-GCM CryptoKey from a user PIN string using PBKDF2 with SHA-256.
 *
 * @param pin - User security PIN string.
 * @param salt - Cryptographic salt byte array.
 * @returns Derived CryptoKey suitable for AES-GCM encryption and decryption.
 */
export async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const pinBytes = encoder.encode(pin.trim());

  const baseKey = await crypto.subtle.importKey('raw', pinBytes, 'PBKDF2', false, ['deriveKey']);

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: Constants.PIN_PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts arbitrary serializable data into an AES-256-GCM envelope using the provided PIN.
 *
 * @param data - Serializable payload to encrypt.
 * @param pin - User security PIN string.
 * @returns Encrypted envelope containing version, salt, IV, and ciphertext.
 */
export async function encryptData<T>(data: T, pin: string): Promise<Types.EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(Constants.PIN_SALT_BYTE_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(Constants.PIN_IV_BYTE_LENGTH));
  const key = await deriveKeyFromPin(pin, salt);

  const jsonString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(jsonString);

  const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintextBytes);

  return {
    version: 1,
    salt: uint8ArrayToBase64(salt),
    iv: uint8ArrayToBase64(iv),
    ciphertext: uint8ArrayToBase64(new Uint8Array(encryptedBuffer)),
  };
}

/**
 * Decrypts an AES-256-GCM envelope into the original structured type using the provided PIN.
 *
 * @param payload - Encrypted envelope containing ciphertext and derivation parameters.
 * @param pin - User security PIN string.
 * @returns Decrypted and parsed original payload.
 */
export async function decryptData<T>(payload: Types.EncryptedPayload, pin: string): Promise<T> {
  const salt = base64ToUint8Array(payload.salt);
  const iv = base64ToUint8Array(payload.iv);
  const key = await deriveKeyFromPin(pin, salt);

  const ciphertextBytes = base64ToUint8Array(payload.ciphertext);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    ciphertextBytes as unknown as BufferSource
  );

  const decoder = new TextDecoder();
  const jsonString = decoder.decode(decryptedBuffer);
  return JSON.parse(jsonString) as T;
}

/**
 * Generates an encrypted verification sentinel payload used to authenticate future PIN entries.
 *
 * @param pin - User security PIN string.
 * @returns Encrypted verification envelope.
 */
export async function createPinVerificationSentinel(pin: string): Promise<Types.EncryptedPayload> {
  return encryptData<string>(Constants.PIN_SENTINEL_PLAINTEXT, pin);
}

/**
 * Tests whether a candidate PIN successfully decrypts the stored verification sentinel.
 *
 * @param pin - Candidate PIN string to test.
 * @param sentinel - Stored verification envelope.
 * @returns True when the PIN successfully decrypts and matches sentinel plaintext.
 */
export async function verifyPin(pin: string, sentinel: Types.EncryptedPayload): Promise<boolean> {
  try {
    const decrypted = await decryptData<string>(sentinel, pin);
    return decrypted === Constants.PIN_SENTINEL_PLAINTEXT;
  } catch {
    return false;
  }
}

/**
 * Checks whether a security PIN verification record exists in local extension storage.
 *
 * @returns True when a security PIN is actively configured.
 */
export async function hasSecurityPin(): Promise<boolean> {
  try {
    if (!browser?.storage?.local) return false;
    const res = await browser.storage.local.get(Constants.PIN_STORAGE_KEY);
    return isEncryptedPayload(res[Constants.PIN_STORAGE_KEY]);
  } catch {
    return false;
  }
}

/**
 * Checks whether the current browsing session is unlocked with a valid PIN.
 *
 * @returns True when the session has an active valid unlocked PIN.
 */
export async function isSessionUnlocked(): Promise<boolean> {
  const pin = await getUnlockedPin();
  return Boolean(pin && validatePinFormat(pin));
}

/**
 * Retrieves the active unlocked PIN from volatile memory or browser session storage.
 *
 * @returns Active PIN string or null if locked.
 */
export async function getUnlockedPin(): Promise<string | null> {
  if (volatileSessionPin) return volatileSessionPin;
  try {
    if (browser?.storage?.session) {
      const res = await browser.storage.session.get(Constants.PIN_SESSION_KEY);
      const stored = res[Constants.PIN_SESSION_KEY];
      if (typeof stored === 'string' && validatePinFormat(stored)) {
        volatileSessionPin = stored;
        return stored;
      }
    }
  } catch {
    // Session storage may be unavailable in some contexts
  }
  return null;
}

/**
 * Caches the validated PIN into volatile memory and browser session storage.
 *
 * @param pin - Validated user security PIN string.
 */
export async function setUnlockedPin(pin: string): Promise<void> {
  const trimmed = pin.trim();
  volatileSessionPin = trimmed;
  try {
    if (browser?.storage?.session) {
      await browser.storage.session.set({ [Constants.PIN_SESSION_KEY]: trimmed });
    }
  } catch {
    // Session storage write failure is non-fatal; volatile cache retained
  }
}

/**
 * Locks the active browsing session by purging PIN from volatile memory and session storage.
 */
export async function lockSession(): Promise<void> {
  volatileSessionPin = null;
  try {
    if (browser?.storage?.session) {
      await browser.storage.session.remove(Constants.PIN_SESSION_KEY);
    }
  } catch {
    // Session storage remove failure is non-fatal
  }
}

/**
 * Purges the security PIN and all encrypted stored secrets from extension storage.
 */
export async function clearSecurityData(): Promise<void> {
  await lockSession();
  try {
    if (browser?.storage?.local) {
      await browser.storage.local.remove([
        Constants.PIN_STORAGE_KEY,
        Constants.API_KEYS_STORAGE_KEY,
        Constants.ATTENDANCE_NICKNAMES_KEY,
      ]);
    }
  } catch (error) {
    console.error('LCR Tools: Failed to clear security data:', error);
  }
}

/* ==========================================================================
   HELPER FUNCTIONS
   ========================================================================== */

/** Converts a binary Uint8Array into a standard Base64 encoded string. */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i] as number);
  }
  return btoa(binary);
}

/** Converts a standard Base64 encoded string into a binary Uint8Array. */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
