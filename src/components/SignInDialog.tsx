"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Provider } from "@supabase/supabase-js";

// Only list providers that are actually enabled in this app's Supabase
// project (Authentication -> Providers); a listed-but-disabled one fails
// with "provider is not enabled". Facebook and Apple aren't set up yet.
const providers: { id: Provider; key: string; icon: string }[] = [
  { id: "google",   key: "google",   icon: "G" },
];

export function SignInDialog({ open, onClose, next }: { open: boolean; onClose: () => void; next?: string }) {
  const t = useTranslations("Auth");
  const [email, setEmail]   = useState("");
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);

  const currentPath =
    next ??
    (typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/");

  async function signInWithOAuth(provider: Provider) {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(currentPath)}`,
      },
    });
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(currentPath)}`,
      },
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <Dialog open={open} onClose={onClose} label={t("dialogTitle")}>
      <h2 className="text-xl font-semibold">{t("dialogTitle")}</h2>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{t("dialogBody")}</p>

      {sent ? (
        <div className="mt-6 text-center py-4">
          <div className="text-4xl mb-3">📬</div>
          <p className="font-semibold text-lg">{t("emailSent")}</p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {t("emailSentBody", { email })}
          </p>
          <button
            onClick={() => { setSent(false); setEmail(""); }}
            className="mt-4 text-xs text-[var(--color-primary)] underline"
          >
            {t("tryDifferentEmail")}
          </button>
        </div>
      ) : (
        <>
          {/* Email magic link */}
          <form onSubmit={sendMagicLink} className="mt-5 flex flex-col gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              required
              className="w-full rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] transition-colors"
            />
            <Button type="submit" size="lg" variant="primary" disabled={loading || !email}>
              {loading ? t("sending") : t("emailButton")}
            </Button>
          </form>

          {/* Divider */}
          {providers.length > 0 && (
            <div className="mt-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-[var(--color-border)]" />
              <span className="text-xs text-[var(--color-muted)]">{t("orContinueWith")}</span>
              <div className="flex-1 h-px bg-[var(--color-border)]" />
            </div>
          )}

          {/* Social providers */}
          <div className="mt-3 grid gap-2 empty:hidden">
            {providers.map((p) => (
              <Button
                key={p.id}
                size="lg"
                variant="secondary"
                onClick={() => signInWithOAuth(p.id)}
                className="justify-start"
              >
                <span className="w-6 inline-flex justify-center text-base font-bold">{p.icon}</span>
                <span className="flex-1 text-start">{t(p.key as never)}</span>
              </Button>
            ))}
          </div>
        </>
      )}

      <p className="mt-4 text-xs text-[var(--color-muted)] text-center">{t("privacyNotice")}</p>
    </Dialog>
  );
}
