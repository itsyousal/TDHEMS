import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionClient from '@/components/SessionClient';
import { Toaster } from '@/components/ui/sonner';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Optimize font loading - show fallback immediately
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "The Dough House - Bakery Management System",
  description: "Comprehensive bakery management system for orders, inventory, production, and more",
  // Performance and SEO optimizations
  applicationName: "The Dough House",
  keywords: ["bakery", "management", "orders", "inventory", "production"],
  authors: [{ name: "The Dough House" }],
  robots: {
    index: true,
    follow: true,
  },
};

// Separate viewport export for optimization
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#8B4513", // Brand color for browser theme
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        {/* Preconnect for faster external resource loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <SessionClient>
          {children}
          <Toaster position="top-right" />
        </SessionClient>
      </body>
    </html>
  );
}
