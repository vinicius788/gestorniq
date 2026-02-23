/**
 * Internationalization module
 * Default language: English (EN)
 * Supported: EN
 */

export type Language = 'en';

export const LANGUAGES = {
  en: { label: 'English', flag: '🇺🇸' },
} as const;

const STORAGE_KEY = 'gestorniq-language';

export function getStoredLanguage(): Language {
  return 'en';
}

export function setStoredLanguage(lang: Language): void {
  localStorage.setItem(STORAGE_KEY, lang);
}
