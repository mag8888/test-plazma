import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
    title: "MONEO Admin",
    description: "Admin Panel",
};

export default function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // Admin layout - no TelegramProvider, no BottomNav
    return <>{children}</>;
}
