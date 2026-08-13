"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { SignInDialog } from "./SignInDialog";

export function CardSaveButton({
  eventId,
  initialSaved,
  isSignedIn,
}: {
  eventId: string;
  initialSaved: boolean;
  isSignedIn: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();      // stop the parent <Link> from navigating
    e.stopPropagation();

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
      <button
        onClick={handleClick}
        disabled={loading}
        aria-label={saved ? "Unsave event" : "Save event"}
        className="absolute bottom-2 end-2 z-10 p-1.5 rounded-full bg-white/90 shadow-md transition hover:bg-white disabled:opacity-50"
      >
        <Heart
          size={15}
          className={saved ? "fill-red-500 text-red-500" : "text-gray-400"}
          aria-hidden
        />
      </button>
      <SignInDialog open={showSignIn} onClose={() => setShowSignIn(false)} />
    </>
  );
}
