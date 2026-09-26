/**
 * Shared API key management and storage types for LCR Tools.
 */

/* ==========================================================================
   TYPES
   ========================================================================== */

/** Named popup screen shown in the extension action popup. */
export type PopupView = 'main' | 'directory' | 'settings' | 'aliases' | 'apiKeys' | 'pinPrompt';

/** Direction of animation when navigating between popup screens. */
export type ViewTransitionDirection = 'forward' | 'backward';

/** Identifier for an extension-managed third-party API key slot. */
export type KnownApiKeyId = 'mapbox' | 'locationiq';

/** Catalog entry describing one API key the extension can store. */
export interface ApiKeyDefinition {
  /** Stable catalog identifier used as the storage dictionary key. */
  id: KnownApiKeyId;
  /** User-facing provider name shown in the More API Keys view. */
  label: string;
  /** Short explanation of what the stored key is used for. */
  description: string;
}

/** Device-local map of catalog API key identifiers to stored secret values. */
export type StoredApiKeys = Partial<Record<KnownApiKeyId, string>>;
