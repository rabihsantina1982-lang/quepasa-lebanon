"use client";
import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Video } from "lucide-react";
import type { EventMediaRow } from "@/lib/supabase/types";
import { MediaTile } from "./MediaTile";
import { cn } from "@/lib/utils";

export function EventMediaCarousel({
  media,
  alt,
}: {
  media: EventMediaRow[];
  alt: string;
}) {
  const [idx, setIdx] = useState(0);
  if (media.length === 0) return null;
  const current = media[idx];

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/9] bg-black rounded-[var(--radius-card)] overflow-hidden">
        <MediaTile media={current} variant="hero" alt={alt} priority />
        {media.length > 1 && (
          <>
            <button
              aria-label="Previous"
              onClick={() => setIdx((i) => (i - 1 + media.length) % media.length)}
              className="absolute start-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/55 text-white flex items-center justify-center rtl:rotate-180"
            >
              <ChevronLeft />
            </button>
            <button
              aria-label="Next"
              onClick={() => setIdx((i) => (i + 1) % media.length)}
              className="absolute end-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/55 text-white flex items-center justify-center rtl:rotate-180"
            >
              <ChevronRight />
            </button>
          </>
        )}
      </div>
      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {media.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setIdx(i)}
              aria-label={`Show media ${i + 1}`}
              aria-current={i === idx}
              className={cn(
                "relative h-16 w-24 shrink-0 rounded-md overflow-hidden border-2",
                i === idx ? "border-[var(--color-primary)]" : "border-transparent"
              )}
            >
              {m.thumbnail_url || m.kind === "image" ? (
                <Image src={m.thumbnail_url ?? m.url} alt="" fill className="object-cover" sizes="96px" />
              ) : (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                  <Video size={18} />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
