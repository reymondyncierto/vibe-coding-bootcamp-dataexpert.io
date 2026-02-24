import type { Metadata } from "next";
import { Providers } from "./providers";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Healio",
  description: "The simplest way to run your clinic."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-app text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
