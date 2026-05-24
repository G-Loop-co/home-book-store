"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Globe2, KeyRound, Save, Settings, SlidersHorizontal } from "lucide-react";
import { useI18n } from "@/features/i18n/I18nProvider";
import { SUPPORTED_UI_LANGUAGES } from "@/lib/i18n";
import type { AppSettings } from "@/lib/types";

interface SettingsResponse {
  settings: AppSettings;
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
  const [settings, setSettings] = useState<AppSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isOpenCodeGo = settings.visionProvider === "opencode-go";
  const activeProviderName = isOpenCodeGo ? "OpenCode Go" : "OpenAI";
  const activeProviderReady = isOpenCodeGo
    ? Boolean(settings.opencodeGoApiKey || settings.visionApiKey)
    : Boolean(settings.openaiApiKey);

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

  function resetActiveProviderDefaults(): void {
    if (isOpenCodeGo) {
      setSettings((current) => ({
        ...current,
        opencodeGoBaseUrl: "https://opencode.ai/zen/go/v1",
        opencodeGoVisionModel: "mimo-v2.5",
        opencodeGoMaxTokens: "2000"
      }));
      return;
    }

    setSettings((current) => ({
      ...current,
      openaiVisionModel: "gpt-4.1-mini"
    }));
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
            <Settings size={18} aria-hidden="true" />
            {t("visionProviderTitle")}
          </h2>
          <div className="provider-options">
            <button
              className={`provider-option ${isOpenCodeGo ? "selected" : ""}`}
              type="button"
              onClick={() => update("visionProvider", "opencode-go")}
            >
              <span className="provider-option-head">
                <span>OpenCode Go</span>
                <span className="badge ok">{t("recommended")}</span>
              </span>
              <span className="field-help">{t("opencodeHelp")}</span>
            </button>
            <button
              className={`provider-option ${settings.visionProvider === "openai" ? "selected" : ""}`}
              type="button"
              onClick={() => update("visionProvider", "openai")}
            >
              <span className="provider-option-head">
                <span>OpenAI</span>
              </span>
              <span className="field-help">{t("openaiHelp")}</span>
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h2>
            <KeyRound size={18} aria-hidden="true" />
            {t("apiKeyTitle", { provider: activeProviderName })}
          </h2>
          {isOpenCodeGo ? (
            <label className="field">
              <span>
                OpenCode Go API key <span className="required-mark">{t("required")}</span>
              </span>
              <input
                value={settings.opencodeGoApiKey}
                onChange={(event) => update("opencodeGoApiKey", event.target.value)}
                placeholder="sk-..."
                type="password"
              />
              <span className="field-help">{t("opencodeApiKeyHelp")}</span>
            </label>
          ) : (
            <label className="field">
              <span>
                OpenAI API key <span className="required-mark">{t("required")}</span>
              </span>
              <input value={settings.openaiApiKey} onChange={(event) => update("openaiApiKey", event.target.value)} placeholder="sk-..." type="password" />
              <span className="field-help">{t("openaiApiKeyHelp")}</span>
            </label>
          )}
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
              {isOpenCodeGo ? (
                <>
                  <label className="field">
                    <span>OpenCode Go base URL</span>
                    <input value={settings.opencodeGoBaseUrl} onChange={(event) => update("opencodeGoBaseUrl", event.target.value)} />
                    <span className="field-help">{t("opencodeBaseHelp")}</span>
                  </label>
                  <label className="field">
                    <span>OpenCode Go vision model</span>
                    <input
                      value={settings.opencodeGoVisionModel}
                      onChange={(event) => update("opencodeGoVisionModel", event.target.value)}
                    />
                    <span className="field-help">{t("opencodeModelHelp")}</span>
                  </label>
                  <label className="field">
                    <span>Max tokens</span>
                    <input
                      value={settings.opencodeGoMaxTokens}
                      onChange={(event) => update("opencodeGoMaxTokens", event.target.value)}
                      inputMode="numeric"
                    />
                    <span className="field-help">{t("maxTokensHelp")}</span>
                  </label>
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
                </>
              ) : (
                <label className="field">
                  <span>OpenAI vision model</span>
                  <input value={settings.openaiVisionModel} onChange={(event) => update("openaiVisionModel", event.target.value)} />
                  <span className="field-help">{t("openaiModelHelp")}</span>
                </label>
              )}
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
