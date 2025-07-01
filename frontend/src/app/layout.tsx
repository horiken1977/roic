import type { Metadata } from "next";
import Navigation from "../components/Navigation";
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
        <Navigation />
        <main className="container mx-auto p-4">
          {children}
        </main>
      </body>
    </html>
  );
}
