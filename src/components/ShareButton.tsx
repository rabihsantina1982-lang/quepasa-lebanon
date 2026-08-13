"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Share2, Check } from "lucide-react";

export function ShareButton({
  title,
  url,
  label,
  copiedLabel,
}: {
  title: string;
  url: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // user cancelled the native share sheet — nothing to do
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked (permissions, insecure context) —
      // fall back to a prompt so the user can copy the link manually.
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <Button size="lg" variant="ghost" onClick={handleShare}>
      {copied ? <Check size={16} /> : <Share2 size={16} />}
      {copied ? copiedLabel : label}
    </Button>
  );
}
