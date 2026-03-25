"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { translations, Language, TranslationKeys } from "./translations";

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

type TranslationPath = NestedKeyOf<TranslationKeys>;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: TranslationPath, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("fr");

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("minee-language", lang);
      document.documentElement.lang = lang;
    }
  }, []);

  const t = useCallback(
    (path: TranslationPath, params?: Record<string, string | number>): string => {
      const keys = path.split(".");
      let value: unknown = translations[language];

      for (const key of keys) {
        if (value && typeof value === "object" && key in value) {
          value = (value as Record<string, unknown>)[key];
        } else {
          console.warn(`Translation missing: ${path}`);
          return path;
        }
      }

      if (typeof value !== "string") {
        console.warn(`Translation is not a string: ${path}`);
        return path;
      }

      if (params) {
        return Object.entries(params).reduce(
          (acc, [key, val]) => acc.replace(`{${key}}`, String(val)),
          value
        );
      }

      return value;
    },
    [language]
  );

  const contextValue = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t]
  );

  return (
    <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
