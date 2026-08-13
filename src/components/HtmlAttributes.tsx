"use client";

import { useEffect } from "react";

/**
 * Sets lang and dir on <html> client-side so the root layout can own the
 * <html> tag (required by Next.js 16) while locale layouts still control
 * language direction without nesting a second <html>.
 */
export function HtmlAttributes({ lang, dir }: { lang: string; dir: "ltr" | "rtl" }) {
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  return null;
}
