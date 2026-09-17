import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Studio 601",
  description: "Fitness, Wellness e Dance.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: { url: "/favicon-studio.png", type: "image/png", sizes: "64x64" },
    shortcut: "/favicon-studio.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-PT">
      <body className="antialiased">{children}</body>
    </html>
  );
}
