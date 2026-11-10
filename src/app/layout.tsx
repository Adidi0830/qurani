import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import NextTopLoader from "nextjs-toploader";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Admin Qurani",
  description: "Modern Quran application - Read, listen, and learn the Holy Quran with advanced features and beautiful interface",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/icons/qurani-192.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="/videos" />
        <link rel="dns-prefetch" href="/videos" />
        <link rel="preload" href="/videos/V-utama.mp4" as="video" type="video/mp4" />
      </head>
      <body
        cz-shortcut-listen="true"
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextTopLoader
          color="#059669"
          height={3}
          showSpinner={false}
          crawlSpeed={200}
          speed={400}
          zIndex={99999}
          shadow="0 0 10px #059669, 0 0 5px #059669"
        />
        {children}
      </body>
    </html>
  );
}
