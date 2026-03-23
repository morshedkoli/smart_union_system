import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Union - Union Parishad Management System",
  description: "A comprehensive digital management system for Union Parishads in Bangladesh",
  keywords: ["union parishad", "e-governance", "bangladesh", "smart union", "digital government"],
  authors: [{ name: "Smart Union Team" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
