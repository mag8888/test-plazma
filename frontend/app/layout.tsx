import { Suspense } from "react";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { TelegramProvider } from "../components/TelegramProvider";
import LanguageProvider from "../components/LanguageProvider";
import { BottomNav } from "../components/BottomNav";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "MONEO",
  description: "Финансовый тренажер",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <TelegramProvider>
          <LanguageProvider>
            {children}
            <Suspense fallback={null}>
              <BottomNav />
            </Suspense>
          </LanguageProvider>
        </TelegramProvider>
      </body>
    </html>
  );
}
