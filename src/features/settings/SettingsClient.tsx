"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Download, FileUp, Globe2, KeyRound, Loader2, Save, Settings, SlidersHorizontal } from "lucide-react";
import { useI18n } from "@/features/i18n/I18nProvider";
import { useErrorToast } from "@/features/toast/ToastProvider";
import { SUPPORTED_UI_LANGUAGES } from "@/lib/i18n";
import type { AppSettings } from "@/lib/types";
import { VISION_PROVIDER_DEFINITIONS, visionProviderDefinition } from "@/lib/vision/provider-config";

interface SettingsResponse {
  settings: AppSettings;
}

interface LibraryImportResponse {
  summary?: {
    rows: number;
    createdBooks: number;
    mergedBooks: number;
    createdCopies: number;
    skippedCopies: number;
    errors: Array<{ row: number; message: string }>;
  };
  error?: string;
}

const emptySettings: AppSettings = {
  uiLanguage: "zh-Hant",
  visionProvider: "opencode-go",
  visionApiKey: "",
  opencodeGoApiKey: "",
  opencodeGoBaseUrl: "https://opencode.ai/zen/go/v1",
  opencodeGoVisionModel: "mimo-v2.5",
  opencodeGoMaxTokens: "2000",
  openaiApiKey: "",
  openaiVisionModel: "gpt-4.1-mini",
  grokApiKey: "",
  grokBaseUrl: "https://api.x.ai/v1",
  grokVisionModel: "grok-2-vision-1212",
  grokMaxTokens: "2000",
  geminiApiKey: "",
  geminiVisionModel: "gemini-2.0-flash",
  geminiMaxTokens: "2000",
  claudeApiKey: "",
  claudeVisionModel: "claude-3-5-sonnet-latest",
  claudeMaxTokens: "2000",
  googleBooksApiKey: "",
  isbndbApiKey: "",
  naverClientId: "",
  naverClientSecret: "",
  rakutenApplicationId: "",
  rakutenAccessKey: ""
};

const metadataKeyLinks = {
  googleBooks: "https://console.cloud.google.com/apis/library/books.googleapis.com",
  isbndb: "https://isbndb.com/apidocs",
  naver: "https://developers.naver.com/apps/#/register",
  rakuten: "https://webservice.rakuten.co.jp/app/create"
};

export function SettingsClient(): React.ReactElement {
  const { language, setLanguage, t } = useI18n();
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const [settings, setSettings] = useState<AppSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useErrorToast(error);

  const activeProvider = visionProviderDefinition(settings.visionProvider);
  const activeProviderName = activeProvider.label;
  const activeApiKey = String(settings[activeProvider.apiKeySetting] ?? "");
  const activeProviderReady = Boolean(activeApiKey || (settings.visionProvider === "opencode-go" && settings.visionApiKey));

  useEffect(() => {
    fetch("/api/settings")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(t("settingsReadFailed"));
        }
        return (await response.json()) as SettingsResponse;
      })
      .then((data) => {
        setSettings(data.settings);
        setLanguage(data.settings.uiLanguage);
        setError("");
      })
      .catch((settingsError: unknown) => {
        setError(settingsError instanceof Error ? settingsError.message : t("settingsReadFailed"));
      })
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    setSettings((current) => ({ ...current, [key]: value }));
    if (key === "uiLanguage") {
      setLanguage(value as AppSettings["uiLanguage"]);
    }
  }

  function updateString(key: keyof AppSettings, value: string): void {
    update(key, value as never);
  }

  function labelForKey(key: string): string {
    return t(key as never);
  }

  function resetActiveProviderDefaults(): void {
    const defaults: Record<AppSettings["visionProvider"], Partial<AppSettings>> = {
      "opencode-go": {
        opencodeGoBaseUrl: "https://opencode.ai/zen/go/v1",
        opencodeGoVisionModel: "mimo-v2.5",
        opencodeGoMaxTokens: "2000"
      },
      openai: { openaiVisionModel: "gpt-4.1-mini" },
      grok: { grokBaseUrl: "https://api.x.ai/v1", grokVisionModel: "grok-2-vision-1212", grokMaxTokens: "2000" },
      gemini: { geminiVisionModel: "gemini-2.0-flash", geminiMaxTokens: "2000" },
      claude: { claudeVisionModel: "claude-3-5-sonnet-latest", claudeMaxTokens: "2000" }
    };

    setSettings((current) => ({ ...current, ...defaults[current.visionProvider] }));
  }

  async function save(): Promise<void> {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings)
      });
      const data = (await response.json()) as SettingsResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || t("settingsSaveFailed"));
      }
      setSettings(data.settings);
      setLanguage(data.settings.uiLanguage);
      setMessage(t("settingsSaved"));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("settingsSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  function exportCsv(): void {
    window.location.href = "/api/library/export";
  }

  async function importCsv(file: File): Promise<void> {
    setImportingCsv(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("csv", file);
      const response = await fetch("/api/library/import", {
        method: "POST",
        body: formData
      });
      const data = (await response.json()) as LibraryImportResponse;
      if (!response.ok || !data.summary) {
        throw new Error(data.error || t("csvImportFailed"));
      }

      setMessage(
        t("csvImportSummary", {
          rows: data.summary.rows,
          books: data.summary.createdBooks,
          copies: data.summary.createdCopies,
          skipped: data.summary.skippedCopies,
          errors: data.summary.errors.length
        })
      );
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : t("csvImportFailed"));
    } finally {
      setImportingCsv(false);
      if (csvInputRef.current) {
        csvInputRef.current.value = "";
      }
    }
  }

  return (
    <>
      <section className="page-head">
        <div>
          <p className="eyebrow">{t("settingsEyebrow")}</p>
          <h1>{t("settingsTitle")}</h1>
        </div>
        <button className="button primary" type="button" onClick={save} disabled={loading || saving}>
          <Save size={18} aria-hidden="true" />
          {saving ? t("saving") : t("save")}
        </button>
      </section>

      {error ? <div className="notice error">{error}</div> : null}
      {message ? <div className="notice ok">{message}</div> : null}

      <section className="settings-panel">
        <div className="settings-summary">
          <div>
            <span className="muted">{t("settingsSummaryVision")}</span>
            <strong>{activeProviderName}</strong>
          </div>
          <span className={`badge ${activeProviderReady ? "ok" : "warn"}`}>{activeProviderReady ? t("keyReady") : t("keyNeeded")}</span>
        </div>

        <div className="settings-section">
          <h2>
            <Globe2 size={18} aria-hidden="true" />
            {t("languageSectionTitle")}
          </h2>
          <label className="field">
            <span>{t("uiLanguage")}</span>
            <select value={settings.uiLanguage || language} onChange={(event) => update("uiLanguage", event.target.value as AppSettings["uiLanguage"])}>
              {SUPPORTED_UI_LANGUAGES.map((entry) => (
                <option value={entry.code} key={entry.code}>
                  {entry.nativeLabel} · {entry.label}
                </option>
              ))}
            </select>
            <span className="field-help">{t("chooseLanguageHelp")}</span>
          </label>
        </div>

        <div className="settings-section">
          <h2>
            <Download size={18} aria-hidden="true" />
            CSV
          </h2>
          <div className="actions">
            <button className="button" type="button" onClick={exportCsv} title={t("exportCsv")}>
              <Download size={18} aria-hidden="true" />
              {t("exportCsv")}
            </button>
            <button className="button" type="button" onClick={() => csvInputRef.current?.click()} disabled={importingCsv} title={t("importCsv")}>
              {importingCsv ? <Loader2 size={18} aria-hidden="true" /> : <FileUp size={18} aria-hidden="true" />}
              {importingCsv ? t("importingCsv") : t("importCsv")}
            </button>
            <input
              ref={csvInputRef}
              className="file-input"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void importCsv(file);
                }
              }}
            />
          </div>
        </div>

        <div className="settings-section">
          <h2>
            <Settings size={18} aria-hidden="true" />
            {t("visionProviderTitle")}
          </h2>
          <div className="provider-options">
            {VISION_PROVIDER_DEFINITIONS.map((provider) => (
              <button
                className={`provider-option ${settings.visionProvider === provider.id ? "selected" : ""}`}
                type="button"
                onClick={() => update("visionProvider", provider.id)}
                key={provider.id}
              >
                <span className="provider-option-head">
                  <span>{provider.label}</span>
                  {provider.recommended ? <span className="badge ok">{t("recommended")}</span> : null}
                </span>
                <span className="field-help">{labelForKey(provider.helpKey)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <h2>
            <KeyRound size={18} aria-hidden="true" />
            {t("apiKeyTitle", { provider: activeProviderName })}
          </h2>
          <label className="field">
            <span>
              {activeProviderName} API key <span className="required-mark">{t("required")}</span>
            </span>
            <input
              value={String(settings[activeProvider.apiKeySetting] ?? "")}
              onChange={(event) => updateString(activeProvider.apiKeySetting, event.target.value)}
              placeholder="sk-..."
              type="password"
            />
            <span className="field-help">{labelForKey(activeProvider.apiKeyHelpKey)}</span>
          </label>
        </div>

        <div className="settings-section">
          <h2>
            <KeyRound size={18} aria-hidden="true" />
            {t("googleBooksTitle")}
          </h2>
          <div className="field-grid">
            <label className="field wide">
              <span>
                Google Books API key <span className="optional-mark">{t("optional")}</span>
              </span>
              <input
                value={settings.googleBooksApiKey}
                onChange={(event) => update("googleBooksApiKey", event.target.value)}
                placeholder={t("googleBooksPlaceholder")}
                type="password"
              />
              <span className="field-help">{t("googleBooksKeyHelp")}</span>
            </label>
            <div className="advanced-actions wide">
              <a className="button" href={metadataKeyLinks.googleBooks} target="_blank" rel="noreferrer">
                {t("applyKey")}
              </a>
            </div>
            <p className="field-help wide">{t("googleBooksHelp")}</p>
          </div>
        </div>

        <div className="settings-section">
          <h2>
            <KeyRound size={18} aria-hidden="true" />
            {t("keySourcesTitle")}
          </h2>
          <p className="field-help">{t("keySourcesHelp")}</p>
          <div className="field-grid advanced-grid">
            <label className="field wide">
              <span>{t("isbndbApiKeyLabel")}</span>
              <input
                value={settings.isbndbApiKey}
                onChange={(event) => update("isbndbApiKey", event.target.value)}
                placeholder={t("googleBooksPlaceholder")}
                type="password"
              />
              <span className="field-help">{t("isbndbHelp")}</span>
            </label>
            <div className="advanced-actions wide">
              <a className="button" href={metadataKeyLinks.isbndb} target="_blank" rel="noreferrer">
                {t("applyKey")}
              </a>
            </div>

            <label className="field">
              <span>{t("naverClientIdLabel")}</span>
              <input
                value={settings.naverClientId}
                onChange={(event) => update("naverClientId", event.target.value)}
                placeholder={t("googleBooksPlaceholder")}
              />
            </label>
            <label className="field">
              <span>{t("naverClientSecretLabel")}</span>
              <input
                value={settings.naverClientSecret}
                onChange={(event) => update("naverClientSecret", event.target.value)}
                placeholder={t("googleBooksPlaceholder")}
                type="password"
              />
            </label>
            <div className="advanced-actions wide">
              <span className="field-help">{t("naverHelp")}</span>
              <a className="button" href={metadataKeyLinks.naver} target="_blank" rel="noreferrer">
                {t("applyKey")}
              </a>
            </div>

            <label className="field">
              <span>{t("rakutenApplicationIdLabel")}</span>
              <input
                value={settings.rakutenApplicationId}
                onChange={(event) => update("rakutenApplicationId", event.target.value)}
                placeholder={t("googleBooksPlaceholder")}
              />
            </label>
            <label className="field">
              <span>{t("rakutenAccessKeyLabel")}</span>
              <input
                value={settings.rakutenAccessKey}
                onChange={(event) => update("rakutenAccessKey", event.target.value)}
                placeholder={t("googleBooksPlaceholder")}
                type="password"
              />
            </label>
            <div className="advanced-actions wide">
              <span className="field-help">{t("rakutenHelp")}</span>
              <a className="button" href={metadataKeyLinks.rakuten} target="_blank" rel="noreferrer">
                {t("applyKey")}
              </a>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <button className="settings-section-toggle" type="button" onClick={() => setShowAdvanced((current) => !current)}>
            <span>
              <SlidersHorizontal size={18} aria-hidden="true" />
              {t("advancedSettings")}
            </span>
            {showAdvanced ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
          </button>

          {showAdvanced ? (
            <div className="field-grid advanced-grid">
              {activeProvider.baseUrlSetting ? (
                <label className="field">
                  <span>{t("providerBaseUrlLabel", { provider: activeProviderName })}</span>
                  <input value={String(settings[activeProvider.baseUrlSetting] ?? "")} onChange={(event) => updateString(activeProvider.baseUrlSetting!, event.target.value)} />
                  <span className="field-help">{t("providerBaseUrlHelp")}</span>
                </label>
              ) : null}
              <label className="field">
                <span>{t("providerModelLabel", { provider: activeProviderName })}</span>
                <input value={String(settings[activeProvider.modelSetting] ?? "")} onChange={(event) => updateString(activeProvider.modelSetting, event.target.value)} />
                <span className="field-help">{t("providerModelHelp")}</span>
              </label>
              {activeProvider.maxTokensSetting ? (
                <label className="field">
                  <span>{t("providerMaxTokensLabel")}</span>
                  <input
                    value={String(settings[activeProvider.maxTokensSetting] ?? "")}
                    onChange={(event) => updateString(activeProvider.maxTokensSetting!, event.target.value)}
                    inputMode="numeric"
                  />
                  <span className="field-help">{t("maxTokensHelp")}</span>
                </label>
              ) : null}
              {settings.visionProvider === "opencode-go" ? (
                <label className="field">
                  <span>{t("fallbackVisionKey")}</span>
                  <input
                    value={settings.visionApiKey}
                    onChange={(event) => update("visionApiKey", event.target.value)}
                    placeholder={t("fallbackVisionPlaceholder")}
                    type="password"
                  />
                  <span className="field-help">{t("fallbackVisionHelp")}</span>
                </label>
              ) : null}
              <div className="advanced-actions wide">
                <button className="button" type="button" onClick={resetActiveProviderDefaults}>
                  {t("useDefaults")}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
