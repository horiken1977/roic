import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ROIC分析アプリケーション",
  description: "日系上場企業のROIC（投下資本利益率）分析ツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <nav className="bg-blue-600 text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <Link href="/" className="text-xl font-bold hover:text-blue-200 transition-colors">
              ROIC分析システム
            </Link>
            <div className="space-x-4">
              <Link href="/" className="hover:text-blue-200 transition-colors">
                ホーム
              </Link>
              <Link href="/companies" className="hover:text-blue-200 transition-colors">
                企業検索
              </Link>
              <Link href="/dashboard" className="hover:text-blue-200 transition-colors">
                ダッシュボード
              </Link>
            </div>
          </div>
        </nav>
        <main className="container mx-auto p-4">
          {children}
        </main>
      </body>
    </html>
  );
}
