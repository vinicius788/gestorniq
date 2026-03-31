import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Language, getStoredLanguage, setStoredLanguage, LANGUAGES } from '@/lib/i18n';
import { en, type Translations } from '@/lib/i18n/translations/en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  availableLanguages: typeof LANGUAGES;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Translations> = {
  en,
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => getStoredLanguage());

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    setStoredLanguage(lang);
  }, []);

  useEffect(() => {
    // Set document lang attribute
    document.documentElement.lang = 'en';
  }, [language]);

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t,
      availableLanguages: LANGUAGES,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
