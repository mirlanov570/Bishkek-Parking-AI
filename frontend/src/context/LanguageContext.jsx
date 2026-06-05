import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
  } from 'react';
  import { DEFAULT_LANGUAGE, languages, translations } from '../i18n/translations';
  
  const LANGUAGE_STORAGE_KEY = 'bishkek_parking_ai_language';
  
  const LanguageContext = createContext(null);
  
  const isLanguageSupported = (languageCode) =>
    languages.some((language) => language.code === languageCode);
  
  const getSavedLanguage = () => {
    if (typeof window === 'undefined') {
      return DEFAULT_LANGUAGE;
    }
  
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  
    if (savedLanguage && isLanguageSupported(savedLanguage)) {
      return savedLanguage;
    }
  
    return DEFAULT_LANGUAGE;
  };
  
  const getNestedValue = (source, key) =>
    key.split('.').reduce((currentValue, keyPart) => {
      if (currentValue && Object.prototype.hasOwnProperty.call(currentValue, keyPart)) {
        return currentValue[keyPart];
      }
  
      return undefined;
    }, source);
  
  export function LanguageProvider({ children }) {
    const [language, setLanguageState] = useState(getSavedLanguage);
  
    const setLanguage = useCallback((nextLanguage) => {
      const normalizedLanguage = isLanguageSupported(nextLanguage)
        ? nextLanguage
        : DEFAULT_LANGUAGE;
  
      setLanguageState(normalizedLanguage);
  
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLanguage);
      }
    }, []);
  
    const t = useCallback(
      (key) => {
        const translatedValue = getNestedValue(translations[language], key);
  
        if (translatedValue !== undefined) {
          return translatedValue;
        }
  
        const fallbackValue = getNestedValue(translations[DEFAULT_LANGUAGE], key);
  
        return fallbackValue !== undefined ? fallbackValue : key;
      },
      [language],
    );
  
    useEffect(() => {
      document.documentElement.lang = language;
    }, [language]);
  
    const currentLanguage = useMemo(
      () => languages.find((item) => item.code === language) || languages[0],
      [language],
    );
  
    const value = useMemo(
      () => ({
        language,
        currentLanguage,
        languages,
        setLanguage,
        t,
      }),
      [currentLanguage, language, setLanguage, t],
    );
  
    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
  }
  
  export function useLanguage() {
    const context = useContext(LanguageContext);
  
    if (!context) {
      throw new Error('useLanguage must be used inside LanguageProvider');
    }
  
    return context;
  }
  
  export default LanguageContext;