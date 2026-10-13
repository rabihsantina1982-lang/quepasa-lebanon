"use client";

import { useState } from "react";
import { EyeOff, Eye } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Admin: hide a live event from the site, or put a hidden one back.
export function EventStatusButton({
  eventId,
  action,
  label,
  confirmText,
  redirectTo,
  className,
}: {
  eventId: string;
  action: "hide" | "show";
  label: string;
  confirmText?: string;
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    const res = await fetch("/api/admin/event-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, action }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Something went wrong.");
      setBusy(false);
      return;
    }
    if (redirectTo) router.push(redirectTo);
    else router.refresh();
    setBusy(false);
  }

  const Icon = action === "hide" ? EyeOff : Eye;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn("inline-flex items-center gap-1 text-[var(--color-primary)] hover:underline disabled:opacity-50", className)}
    >
      <Icon size={12} aria-hidden /> {label}
    </button>
  );
}
