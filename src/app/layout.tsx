import type { Metadata } from "next";
import { I18nProvider } from "@/features/i18n/I18nProvider";
import { AppShell } from "@/features/shell/AppShell";
import { ToastProvider } from "@/features/toast/ToastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Home Book Store",
  description: "Home library import and catalog app"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return (
    <html lang="zh-Hant">
      <body>
        <I18nProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
