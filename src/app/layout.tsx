import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "SupportMate AI";

export const metadata: Metadata = {
  title: `${appName} | Instant answers from our knowledge base`,
  description:
    "AI-powered customer support that answers questions about shipping, returns, refunds, payments and orders using a company knowledge base.",
};

export const viewport: Viewport = {
  themeColor: "#060a18",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
