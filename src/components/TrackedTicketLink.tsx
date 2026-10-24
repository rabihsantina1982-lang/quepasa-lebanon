"use client";

import type { ReactNode } from "react";
import { trackEventActivity } from "@/lib/track";
import { withQuePasaTag } from "@/lib/outboundLinks";

// An outbound "Get tickets" / "Call to book" link that logs a ticket_click.
// Web links get QuePasa's source tag (utm_source=quepasa, utm_campaign=<event
// slug>) so the organiser's ticketing site can count sales from QuePasa.
export function TrackedTicketLink({
  eventId,
  href,
  campaign,
  className,
  children,
  skip,
}: {
  eventId: string;
  href: string;
  campaign?: string;
  className?: string;
  children: ReactNode;
  skip?: boolean;
}) {
  const external = href.startsWith("http");
  return (
    <a
      href={external ? withQuePasaTag(href, campaign) : href}
      className={className}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      onClick={() => { if (!skip) trackEventActivity(eventId, "ticket_click"); }}
    >
      {children}
    </a>
  );
}
