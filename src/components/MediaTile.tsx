"use client";
import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { PlayCircle, Volume2, VolumeX } from "lucide-react";
import type { EventMediaRow } from "@/lib/supabase/types";

interface Props {
  media: EventMediaRow;
  // "card" = small autoplay-on-hover/in-view tile for cards
  // "hero" = full-bleed inline player for detail page
  variant?: "card" | "hero";
  priority?: boolean;
  alt?: string;
}

export function MediaTile({ media, variant = "card", priority, alt }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (media.kind !== "video" || variant !== "card") return;
    const el = videoRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().then(() => setPlaying(true)).catch(() => void 0);
        } else {
          el.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.6 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [media.kind, variant]);

  if (media.kind === "image") {
    return (
      <Image
        src={media.url}
        alt={alt ?? ""}
        fill
        priority={priority}
        sizes={variant === "hero" ? "100vw" : "(max-width: 768px) 100vw, 33vw"}
        className="object-cover"
      />
    );
  }

  // YouTube / Vimeo iframe (hero only — cards autoplay native mp4)
  if (media.provider === "youtube" && variant === "hero") {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${media.url}`}
        title={alt ?? "Event video"}
        className="absolute inset-0 w-full h-full"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    );
  }
  if (media.provider === "vimeo" && variant === "hero") {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${media.url}`}
        title={alt ?? "Event video"}
        className="absolute inset-0 w-full h-full"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }

  // Native mp4/webm
  return (
    <>
      <video
        ref={videoRef}
        src={media.url}
        poster={media.thumbnail_url ?? undefined}
        playsInline
        muted={muted}
        loop
        preload="metadata"
        data-autoplay={variant === "card" ? "true" : undefined}
        controls={variant === "hero"}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {variant === "card" && (
        <>
          {!playing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <PlayCircle className="text-white/90 drop-shadow" size={42} />
            </div>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMuted((m) => !m);
            }}
            aria-label={muted ? "Unmute" : "Mute"}
            className="absolute bottom-2 end-2 h-9 w-9 rounded-full bg-black/55 text-white flex items-center justify-center"
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </>
      )}
    </>
  );
}
