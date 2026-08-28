import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/feedback";
import "./globals.css";

export const metadata: Metadata = {
  title: "REAL / REMAX HomeFax",
  description:
    "The digital identity of real estate — a permanent, append-only property record.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
