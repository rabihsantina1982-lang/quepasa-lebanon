"use client";

import { Share2 } from "lucide-react";
import { ShareMenu } from "./ShareMenu";

export function CardShareButton({
  eventId,
  title,
  url,
  shareLabel,
  whatsappLabel,
  copyLabel,
  copiedLabel,
}: {
  eventId: string;
  title: string;
  url: string;
  shareLabel: string;
  whatsappLabel: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  return (
    <ShareMenu
      eventId={eventId}
      title={title}
      url={url}
      whatsappLabel={whatsappLabel}
      copyLabel={copyLabel}
      copiedLabel={copiedLabel}
      align="start"
      wrapperClassName="absolute bottom-2 start-2 z-10"
      trigger={({ onClick }) => (
        <button
          onClick={onClick}
          aria-label={shareLabel}
          className="p-3 rounded-full bg-white/90 shadow-md transition hover:bg-white"
        >
          <Share2 size={18} className="text-gray-500" aria-hidden />
        </button>
      )}
    />
  );
}
