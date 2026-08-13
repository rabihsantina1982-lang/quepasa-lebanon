"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  label?: string;
}

export function Dialog({ open, onClose, children, label }: DialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "backdrop:bg-black/50 backdrop:backdrop-blur-sm",
        "fixed inset-0 m-auto p-0 bg-transparent",
        "open:flex open:items-center open:justify-center"
      )}
    >
      <div className="bg-[var(--color-card)] text-[var(--color-fg)] rounded-[var(--radius-card)] shadow-2xl w-[min(92vw,420px)] p-6">
        {children}
      </div>
    </dialog>
  );
}
