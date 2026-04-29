import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Walsh Co",
  description: "Walsh Co workspace",
};

export const viewport = {
  themeColor: "#244c3a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link
          rel="preconnect"
          href="https://use.typekit.net"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://p.typekit.net"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://use.typekit.net/jfb6hkb.css"
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
