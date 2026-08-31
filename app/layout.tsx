import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asher's Site",
  description: "WRS Dojo lesson planning, instruction, and student progress.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
