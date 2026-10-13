"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Permanently deletes an event (its poster or an admin; checked on the
// server by /api/events/delete). Asks first. After deleting, goes to
// `redirectTo` or refreshes the current page.
export function DeleteEventButton({
  eventId,
  label,
  confirmText,
  errorText = "Couldn't delete the event. Please try again.",
  redirectTo,
  className,
}: {
  eventId: string;
  label: string;
  confirmText: string;
  errorText?: string;
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!confirm(confirmText)) return;
    setBusy(true);
    const res = await fetch("/api/events/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || errorText);
      setBusy(false);
      return;
    }
    if (redirectTo) router.push(redirectTo);
    else router.refresh();
    setBusy(false);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn("inline-flex items-center gap-1 text-[var(--color-danger)] hover:underline disabled:opacity-50", className)}
    >
      <Trash2 size={12} aria-hidden /> {label}
    </button>
  );
}
