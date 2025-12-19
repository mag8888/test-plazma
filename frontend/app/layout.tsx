import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TelegramProvider } from "../components/TelegramProvider";
import { BottomNav } from "../components/BottomNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TelegramProvider>
          {children}
          <BottomNav />
        </TelegramProvider>
      </body>
    </html>
  );
}
