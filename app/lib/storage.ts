/**
 * LocalStorage helper for API keys and settings
 */

export interface StoredApiKeys {
  openai?: string;
  google?: string;
  elevenlabs?: string;
  voiceId?: string;
}

const STORAGE_KEY = 'jonbin_api_keys';

/**
 * Load API keys from LocalStorage
 */
export function loadApiKeys(): StoredApiKeys {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {};
    }
    return JSON.parse(stored) as StoredApiKeys;
  } catch (error) {
    console.error('Failed to load API keys from localStorage:', error);
    return {};
  }
}

/**
 * Save API keys to LocalStorage
 */
export function saveApiKeys(keys: StoredApiKeys): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch (error) {
    console.error('Failed to save API keys to localStorage:', error);
  }
}

/**
 * Clear API keys from LocalStorage
 */
export function clearApiKeys(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear API keys from localStorage:', error);
  }
}

/**
 * Validate API key format (basic check)
 */
export function validateApiKey(key: string, provider: keyof StoredApiKeys): boolean {
  if (!key || key.trim().length === 0) {
    return false;
  }

  switch (provider) {
    case 'openai':
      return key.startsWith('sk-');
    case 'google':
      return key.startsWith('AIza') || key.length > 30;
    case 'elevenlabs':
      return key.startsWith('sk_') || key.length > 20;
    case 'voiceId':
      return key.length > 10;
    default:
      return true;
  }
}
