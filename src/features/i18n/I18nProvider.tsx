"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_UI_LANGUAGE, languageDirection, normalizeUiLanguage, translate, type Translate } from "@/lib/i18n";
import type { AppSettings, UiLanguage } from "@/lib/types";

interface SettingsResponse {
  settings: AppSettings;
}

interface I18nContextValue {
  language: UiLanguage;
  setLanguage: (language: UiLanguage) => void;
  t: Translate;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  const [language, setLanguageState] = useState<UiLanguage>(DEFAULT_UI_LANGUAGE);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/settings", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as SettingsResponse;
      })
      .then((data) => {
        if (data?.settings.uiLanguage) {
          setLanguageState(normalizeUiLanguage(data.settings.uiLanguage));
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = languageDirection(language);
  }, [language]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage: (nextLanguage) => setLanguageState(normalizeUiLanguage(nextLanguage)),
      t: (key, variables) => translate(language, key, variables)
    }),
    [language]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider.");
  }
  return context;
}
