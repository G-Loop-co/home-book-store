import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Settings, UploadCloud } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Home Book Store",
  description: "Home library import and catalog app"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return (
    <html lang="zh-Hant">
      <body>
        <div className="shell">
          <header className="topbar">
            <div className="topbar-inner">
              <Link href="/" className="brand">
                <span className="brand-mark">
                  <BookOpen size={18} aria-hidden="true" />
                </span>
                <span>Home Book Store</span>
              </Link>
              <nav className="nav" aria-label="Primary">
                <Link href="/">
                  <BookOpen size={16} aria-hidden="true" />
                  藏書
                </Link>
                <Link href="/import">
                  <UploadCloud size={16} aria-hidden="true" />
                  匯入
                </Link>
                <Link href="/settings">
                  <Settings size={16} aria-hidden="true" />
                  設定
                </Link>
              </nav>
            </div>
          </header>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
