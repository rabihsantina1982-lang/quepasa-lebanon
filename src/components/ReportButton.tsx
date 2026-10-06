"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { SignInDialog } from "./SignInDialog";
import { REPORT_REASONS, type ReportReason } from "@/lib/reports";

export function ReportButton({ eventId, isSignedIn }: { eventId: string; isSignedIn: boolean }) {
  const t = useTranslations("Report");
  const [open, setOpen] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "already" | "error">("idle");

  async function submit() {
    if (!reason) return;
    setState("sending");
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, reason, details }),
    }).catch(() => null);
    if (res?.ok) setState("sent");
    else if (res?.status === 409) setState("already");
    else setState("error");
  }

  const done = state === "sent" || state === "already";

  return (
    <>
      <button
        type="button"
        onClick={() => (isSignedIn ? setOpen(true) : setShowSignIn(true))}
        className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:underline"
      >
        <Flag size={12} aria-hidden />
        {t("button")}
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} label={t("title")}>
        {done ? (
          <div className="space-y-4">
            <p>{state === "sent" ? t("thanks") : t("already")}</p>
            <Button className="w-full" onClick={() => setOpen(false)}>{t("close")}</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t("title")}</h2>
            <fieldset className="space-y-1.5">
              <legend className="text-sm text-[var(--color-muted)] mb-2">{t("why")}</legend>
              {REPORT_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--color-bg)] cursor-pointer">
                  <input
                    type="radio"
                    name="report-reason"
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-[var(--color-primary)]"
                  />
                  {t(`reasons.${r}`)}
                </label>
              ))}
            </fieldset>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder={t("detailsPlaceholder")}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
            {state === "error" && <p className="text-sm text-[var(--color-danger)]">{t("error")}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>{t("cancel")}</Button>
              <Button className="flex-1" disabled={!reason || state === "sending"} onClick={submit}>
                {state === "sending" ? t("sending") : t("send")}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <SignInDialog open={showSignIn} onClose={() => setShowSignIn(false)} />
    </>
  );
}
