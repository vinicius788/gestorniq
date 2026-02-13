/**
 * Internationalization module
 * Default language: English (EN)
 * Supported: EN, PT-BR
 */

export type Language = 'en' | 'pt-BR';

export const LANGUAGES = {
  en: { label: 'English', flag: '🇺🇸' },
  'pt-BR': { label: 'Português', flag: '🇧🇷' },
} as const;

const STORAGE_KEY = 'gestorniq-language';

export function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'pt-BR') return 'pt-BR';
  return 'en';
}

export function setStoredLanguage(lang: Language): void {
  localStorage.setItem(STORAGE_KEY, lang);
}
