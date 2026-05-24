"use client";

import Link from "next/link";
import { BookOpen, Settings, UploadCloud } from "lucide-react";
import { useI18n } from "@/features/i18n/I18nProvider";

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  const { t } = useI18n();

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand">
            <span className="brand-mark">
              <BookOpen size={18} aria-hidden="true" />
            </span>
            <span>{t("appName")}</span>
          </Link>
          <nav className="nav" aria-label="Primary">
            <Link href="/">
              <BookOpen size={16} aria-hidden="true" />
              {t("navLibrary")}
            </Link>
            <Link href="/import">
              <UploadCloud size={16} aria-hidden="true" />
              {t("navImport")}
            </Link>
            <Link href="/settings">
              <Settings size={16} aria-hidden="true" />
              {t("navSettings")}
            </Link>
          </nav>
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
