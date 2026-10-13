"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/client";

export function DeleteAccountButton() {
  const t = useTranslations("Account");
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!confirm(t("deleteConfirm"))) return;
    setBusy(true);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || t("deleteError"));
      setBusy(false);
      return;
    }
    await createClient().auth.signOut().catch(() => {});
    // Full reload so the header and menus forget the old session.
    window.location.href = `/${document.documentElement.lang || "en"}/events?accountDeleted=1`;
  }

  return (
    <Button type="button" variant="outline" disabled={busy} onClick={onClick} className="border-[var(--color-danger)] text-[var(--color-danger)]">
      <Trash2 size={16} aria-hidden /> {busy ? t("deleting") : t("deleteButton")}
    </Button>
  );
}
