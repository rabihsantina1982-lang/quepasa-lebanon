"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CaptionBox({ caption }: { caption: string }) {
  const [text, setText] = useState(caption);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="space-y-2">
      <h2 className="font-semibold">Caption</h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.min(16, text.split("\n").length + 1)}
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-sm font-mono"
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" onClick={copy}>{copied ? "Copied ✓" : "Copy caption"}</Button>
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">💬 Send on WhatsApp</Button>
        </a>
      </div>
    </section>
  );
}
