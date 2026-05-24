"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, KeyRound, Save, Settings, SlidersHorizontal } from "lucide-react";
import type { AppSettings } from "@/lib/types";

interface SettingsResponse {
  settings: AppSettings;
}

const emptySettings: AppSettings = {
  visionProvider: "opencode-go",
  visionApiKey: "",
  opencodeGoApiKey: "",
  opencodeGoBaseUrl: "https://opencode.ai/zen/go/v1",
  opencodeGoVisionModel: "mimo-v2.5",
  opencodeGoMaxTokens: "2000",
  openaiApiKey: "",
  openaiVisionModel: "gpt-4.1-mini",
  googleBooksApiKey: ""
};

export function SettingsClient(): React.ReactElement {
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
          throw new Error("設定讀取失敗");
        }
        return (await response.json()) as SettingsResponse;
      })
      .then((data) => {
        setSettings(data.settings);
        setError("");
      })
      .catch((settingsError: unknown) => {
        setError(settingsError instanceof Error ? settingsError.message : "設定讀取失敗");
      })
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    setSettings((current) => ({ ...current, [key]: value }));
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
        throw new Error(data.error || "設定儲存失敗");
      }
      setSettings(data.settings);
      setMessage("已儲存設定");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "設定儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="page-head">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>設定</h1>
        </div>
        <button className="button primary" type="button" onClick={save} disabled={loading || saving}>
          <Save size={18} aria-hidden="true" />
          {saving ? "儲存中" : "儲存"}
        </button>
      </section>

      {error ? <div className="notice error">{error}</div> : null}
      {message ? <div className="notice ok">{message}</div> : null}

      <section className="settings-panel">
        <div className="settings-summary">
          <div>
            <span className="muted">目前 Vision</span>
            <strong>{activeProviderName}</strong>
          </div>
          <span className={`badge ${activeProviderReady ? "ok" : "warn"}`}>{activeProviderReady ? "已填 key" : "需要 API key"}</span>
        </div>

        <div className="settings-section">
          <h2>
            <Settings size={18} aria-hidden="true" />
            選擇 Vision provider
          </h2>
          <div className="provider-options">
            <button
              className={`provider-option ${isOpenCodeGo ? "selected" : ""}`}
              type="button"
              onClick={() => update("visionProvider", "opencode-go")}
            >
              <span className="provider-option-head">
                <span>OpenCode Go</span>
                <span className="badge ok">建議</span>
              </span>
              <span className="field-help">填 OpenCode Go API key 即可。base URL 與 model 已預設。</span>
            </button>
            <button
              className={`provider-option ${settings.visionProvider === "openai" ? "selected" : ""}`}
              type="button"
              onClick={() => update("visionProvider", "openai")}
            >
              <span className="provider-option-head">
                <span>OpenAI</span>
              </span>
              <span className="field-help">只有改用 OpenAI Vision 時才需要填。</span>
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h2>
            <KeyRound size={18} aria-hidden="true" />
            必填：{activeProviderName} API key
          </h2>
          {isOpenCodeGo ? (
            <label className="field">
              <span>
                OpenCode Go API key <span className="required-mark">Required</span>
              </span>
              <input
                value={settings.opencodeGoApiKey}
                onChange={(event) => update("opencodeGoApiKey", event.target.value)}
                placeholder="sk-..."
                type="password"
              />
              <span className="field-help">用 OpenCode Go / opencode.ai vision 時只需要這個 key。</span>
            </label>
          ) : (
            <label className="field">
              <span>
                OpenAI API key <span className="required-mark">Required</span>
              </span>
              <input value={settings.openaiApiKey} onChange={(event) => update("openaiApiKey", event.target.value)} placeholder="sk-..." type="password" />
              <span className="field-help">只有 provider 選 OpenAI 時會使用。</span>
            </label>
          )}
        </div>

        <div className="settings-section">
          <h2>
            <KeyRound size={18} aria-hidden="true" />
            選填：Google Books
          </h2>
          <div className="field-grid">
            <label className="field wide">
              <span>
                Google Books API key <span className="optional-mark">Optional</span>
              </span>
              <input
                value={settings.googleBooksApiKey}
                onChange={(event) => update("googleBooksApiKey", event.target.value)}
                placeholder="可留空"
                type="password"
              />
              <span className="field-help">留空也會查 Open Library、ISBN.tw、KingStone、HKBookCentre、Douban、Internet Archive。</span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <button className="settings-section-toggle" type="button" onClick={() => setShowAdvanced((current) => !current)}>
            <span>
              <SlidersHorizontal size={18} aria-hidden="true" />
              進階設定
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
                    <span className="field-help">預設可用，不改也可以。</span>
                  </label>
                  <label className="field">
                    <span>OpenCode Go vision model</span>
                    <input
                      value={settings.opencodeGoVisionModel}
                      onChange={(event) => update("opencodeGoVisionModel", event.target.value)}
                    />
                    <span className="field-help">預設 mimo-v2.5。</span>
                  </label>
                  <label className="field">
                    <span>Max tokens</span>
                    <input
                      value={settings.opencodeGoMaxTokens}
                      onChange={(event) => update("opencodeGoMaxTokens", event.target.value)}
                      inputMode="numeric"
                    />
                    <span className="field-help">書很多或回傳 JSON 被截斷時才需要加大。</span>
                  </label>
                  <label className="field">
                    <span>Fallback Vision API key</span>
                    <input
                      value={settings.visionApiKey}
                      onChange={(event) => update("visionApiKey", event.target.value)}
                      placeholder="通常不用填"
                      type="password"
                    />
                    <span className="field-help">只有 OpenCode Go key 留空時才會用。</span>
                  </label>
                </>
              ) : (
                <label className="field">
                  <span>OpenAI vision model</span>
                  <input value={settings.openaiVisionModel} onChange={(event) => update("openaiVisionModel", event.target.value)} />
                  <span className="field-help">預設 gpt-4.1-mini。</span>
                </label>
              )}
              <div className="advanced-actions wide">
                <button className="button" type="button" onClick={resetActiveProviderDefaults}>
                  使用預設值
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
