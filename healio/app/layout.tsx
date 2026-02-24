import type { Metadata } from "next";
import Script from "next/script";
import { Providers } from "./providers";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Healio",
  description: "The simplest way to run your clinic.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
  },
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const analyticsId = process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ID?.trim();

  return (
    <html lang="en">
      <body className="bg-app text-ink antialiased">
        <a
          href="#healio-main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-control focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-ink focus:shadow-lg"
        >
          Skip to content
        </a>
        <Providers>
          <div id="healio-main-content">{children}</div>
        </Providers>
        {analyticsId ? (
          <Script
            id="healio-vercel-analytics"
            src={`https://va.vercel-scripts.com/v1/script.js?key=${encodeURIComponent(analyticsId)}`}
            strategy="afterInteractive"
          />
        ) : null}
        <Script id="healio-observability-bootstrap" strategy="afterInteractive">
          {`
            window.__healioObservability = {
              buildTs: ${JSON.stringify(new Date().toISOString())},
              env: ${JSON.stringify(process.env.NODE_ENV || "development")},
              sentryEnabled: ${JSON.stringify(Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN))}
            };
          `}
        </Script>
      </body>
    </html>
  );
}
