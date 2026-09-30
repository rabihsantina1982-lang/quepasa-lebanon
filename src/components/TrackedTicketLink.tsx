"use client";

import type { ReactNode } from "react";
import { trackEventActivity } from "@/lib/track";

// An outbound "Get tickets" / "Call to book" link that logs a ticket_click.
export function TrackedTicketLink({
  eventId,
  href,
  className,
  children,
  skip,
}: {
  eventId: string;
  href: string;
  className?: string;
  children: ReactNode;
  skip?: boolean;
}) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      className={className}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      onClick={() => { if (!skip) trackEventActivity(eventId, "ticket_click"); }}
    >
      {children}
    </a>
  );
}
