"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Link2, Check } from "lucide-react";

interface ShareMenuProps {
  title: string;
  url: string;
  whatsappLabel: string;
  copyLabel: string;
  copiedLabel: string;
  align?: "start" | "end";
  wrapperClassName?: string;
  trigger: (props: { onClick: (e: React.MouseEvent) => void }) => React.ReactNode;
}

export function ShareMenu({
  title,
  url,
  whatsappLabel,
  copyLabel,
  copiedLabel,
  align = "end",
  wrapperClassName,
  trigger,
}: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function toggle(e: React.MouseEvent) {
    e.preventDefault(); // stop a parent <Link> (event cards) from navigating
    e.stopPropagation();
    setOpen((o) => !o);
  }

  function shareWhatsApp(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const text = `${title} ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  async function copyLink(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked (permissions, insecure context) —
      // fall back to a prompt so the user can copy the link manually.
      window.prompt("Copy this link:", url);
    }
    setOpen(false);
  }

  return (
    <div ref={ref} className={wrapperClassName ?? "relative"}>
      {trigger({ onClick: toggle })}
      {open && (
        <div
          role="menu"
          className={`absolute z-20 top-full mt-2 w-52 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg overflow-hidden ${
            align === "end" ? "end-0" : "start-0"
          }`}
        >
          <button
            role="menuitem"
            onClick={shareWhatsApp}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--color-bg)] text-start"
          >
            <MessageCircle size={16} className="text-green-500" aria-hidden />
            {whatsappLabel}
          </button>
          <button
            role="menuitem"
            onClick={copyLink}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--color-bg)] text-start"
          >
            {copied ? <Check size={16} /> : <Link2 size={16} />}
            {copied ? copiedLabel : copyLabel}
          </button>
        </div>
      )}
    </div>
  );
}
