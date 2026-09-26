/**
 * Shared cryptographic and PIN security types for LCR Tools.
 */

/* ==========================================================================
   TYPES
   ========================================================================== */

/** Serialized envelope containing AES-256-GCM ciphertext and derivation parameters. */
export interface EncryptedPayload {
  /** Encryption schema format version. */
  version: number;
  /** Base64-encoded PBKDF2 cryptographic salt. */
  salt: string;
  /** Base64-encoded AES-GCM initialization vector. */
  iv: string;
  /** Base64-encoded ciphertext including authentication tag. */
  ciphertext: string;
  /** Optional array of public catalog keys stored within this encrypted envelope. */
  keyIds?: string[];
}

/** Operational state of user security PIN configuration and session unlock. */
export type PinSecurityStatus = 'unset' | 'locked' | 'unlocked';

/** Mode of operation when presenting the PIN entry prompt to the user. */
export type PinPromptMode = 'setup' | 'unlock';

/** Action target view to navigate to after successful PIN setup or unlock. */
export type PinProtectedView = 'aliases' | 'apiKeys';

/** Result object returned when verifying an entered security PIN. */
export interface PinVerificationResult {
  /** True when the PIN successfully authenticated and unlocked the master key. */
  valid: boolean;
  /** Optional user-facing error message on verification failure. */
  errorMessage?: string;
}
