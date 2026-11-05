"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  label?: string;
}

// True in the browser, false while rendering on the server.
const subscribe = () => () => {};
function useIsClient() {
  return React.useSyncExternalStore(subscribe, () => true, () => false);
}

// Modal dialog. Rendered only while open, straight into <body> (a portal), so
// it never ends up inside the element that opened it: a dialog opened from an
// event card used to sit inside the card's link, which nested links (invalid
// HTML, a hydration error) and let taps inside the dialog open the event.
export function Dialog({ open, onClose, children, label }: DialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const isClient = useIsClient();

  React.useEffect(() => {
    const el = ref.current;
    if (el && open && !el.open) el.showModal();
  }, [open, isClient]);

  if (!isClient || !open) return null;

  return createPortal(
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        // React still bubbles portal events to the opener's parents (e.g. a
        // card link): keep them in here.
        e.stopPropagation();
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
    </dialog>,
    document.body
  );
}
