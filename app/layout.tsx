/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata, Viewport } from "next";
import { RegisterSw } from "@/components/register-sw";
import { Toaster } from "@/components/toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Queue",
    template: "%s · Queue",
  },
  description:
    "A live queue for a clinic or salon. Customers join by QR and watch their place update.",
  appleWebApp: {
    capable: true,
    title: "Queue",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#12263A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Syne:wght@700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
        <RegisterSw />
        <Toaster />
      </body>
    </html>
  );
}
