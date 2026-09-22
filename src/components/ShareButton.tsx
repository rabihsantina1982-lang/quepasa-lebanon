"use client";

import { Button } from "./ui/button";
import { Share2 } from "lucide-react";
import { ShareMenu } from "./ShareMenu";

export function ShareButton({
  eventId,
  title,
  url,
  label,
  whatsappLabel,
  copyLabel,
  copiedLabel,
}: {
  eventId: string;
  title: string;
  url: string;
  label: string;
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
      trigger={({ onClick }) => (
        <Button size="lg" variant="ghost" onClick={onClick}>
          <Share2 size={16} />
          {label}
        </Button>
      )}
    />
  );
}
