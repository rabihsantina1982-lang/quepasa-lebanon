import "./globals.css";

/**
 * Root layout — Next.js 16 requires <html> and <body> to live here.
 * Locale-specific lang/dir are applied client-side by HtmlAttributes
 * inside [locale]/layout.tsx, so suppressHydrationWarning avoids
 * the mismatch warning on the first render.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
