"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "./ui/button";
import { SignInDialog } from "./SignInDialog";
import { useTranslations, useLocale } from "next-intl";

interface RemindButtonProps {
  eventId: string;
  initialReminded: boolean;
  isSignedIn: boolean;
}

export function RemindButton({ eventId, initialReminded, isSignedIn }: RemindButtonProps) {
  const t = useTranslations("Common");
  const locale = useLocale();
  const [reminded, setReminded] = useState(initialReminded);
  const [loading, setLoading] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  async function handleClick() {
    if (!isSignedIn) {
      setShowSignIn(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/reminders/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, locale }),
      });
      if (res.ok) {
        const { reminded: newReminded } = await res.json();
        setReminded(newReminded);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        size="lg"
        variant={reminded ? "secondary" : "ghost"}
        onClick={handleClick}
        disabled={loading}
        aria-label={reminded ? t("reminderSet") : t("remindMe")}
        className={reminded ? "text-amber-600 border-amber-200" : ""}
      >
        <Bell size={16} className={reminded ? "fill-amber-500 text-amber-600" : ""} aria-hidden />
        {reminded ? t("reminderSet") : t("remindMe")}
      </Button>

      <SignInDialog open={showSignIn} onClose={() => setShowSignIn(false)} />
    </>
  );
}
