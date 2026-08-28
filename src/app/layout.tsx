import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BRAND } from "@/lib/brand";
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
  title: `${BRAND.name} | Community Management Platform`,
  description: BRAND.description,
  metadataBase: new URL(BRAND.url),
  openGraph: {
    title: `${BRAND.name} | Community Management Platform`,
    description: BRAND.description,
    url: BRAND.url,
    siteName: BRAND.name,
    images: ["/logo-icon.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} | Community Management Platform`,
    description: BRAND.description,
    images: ["/logo-icon.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
