import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SPCC CRM",
  description: "Southern Province Cement Company -- sales management console",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
