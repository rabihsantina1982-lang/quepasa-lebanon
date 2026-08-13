"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "./ui/button";
import { SignInDialog } from "./SignInDialog";
import { useTranslations } from "next-intl";

interface SaveButtonProps {
  eventId: string;
  initialSaved: boolean;
  isSignedIn: boolean;
}

export function SaveButton({ eventId, initialSaved, isSignedIn }: SaveButtonProps) {
  const t = useTranslations("Common");
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  async function handleClick() {
    // If not signed in, show sign-in dialog
    if (!isSignedIn) {
      setShowSignIn(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/favorites/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      if (res.ok) {
        const { saved: newSaved } = await res.json();
        setSaved(newSaved);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        size="lg"
        variant="secondary"
        onClick={handleClick}
        disabled={loading}
        aria-label={saved ? t("saved") : t("save")}
        className={saved ? "text-red-500 border-red-200" : ""}
      >
        <Heart
          size={16}
          className={saved ? "fill-red-500 text-red-500" : ""}
          aria-hidden
        />
        {saved ? t("saved") : t("save")}
      </Button>

      <SignInDialog open={showSignIn} onClose={() => setShowSignIn(false)} />
    </>
  );
}
