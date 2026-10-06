// Flags ticket links on submitted events that could send buyers to a scam
// page, so the admin opens and checks them before approving. Known sellers
// pass quietly; anything else gets a warning in the review queue.

// Official ticket sellers and festivals people buy from in Lebanon.
const TICKET_SELLERS = [
  "ihjoz.com",
  "antoine.com.lb",
  "antoineonline.com",
  "virginmegastore.me",
  "platinumlist.net",
  "ticketmaster.com",
  "eventbrite.com",
  "cdl.com.lb",
  "baalbeck.org.lb",
  "beiteddine.org",
  "byblosfestival.org",
];

// Where small promoters often take bookings by message. Fine, but there's
// no ticket page to check -- the admin should know who's on the other end.
const SOCIAL = ["instagram.com", "wa.me", "whatsapp.com", "facebook.com", "linktr.ee", "tiktok.com"];

// Hide the real destination.
const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "cutt.ly", "rb.gy", "is.gd", "shorturl.at", "tiny.cc", "s.id"];

export type LinkLevel = "ok" | "check" | "danger";

export interface LinkCheck {
  host: string;
  level: LinkLevel;
  note: string | null;
}

function matches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

// Edit distance, for lookalikes such as "platinumIist.net".
function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

// "tickets.platinumlist.net" -> "platinumlist"; "platinum-list.ae" -> "platinumlist"
function brand(host: string): string {
  const parts = host.split(".");
  const name = parts.length > 2 && parts[parts.length - 2].length <= 3 ? parts[parts.length - 3] : parts[parts.length - 2];
  return (name ?? host).replace(/[^a-z0-9]/g, "");
}

export function checkTicketLink(url: string): LinkCheck {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return { host: url, level: "danger", note: "Not a valid web address" };
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { host, level: "danger", note: `Unusual link type (${parsed.protocol})` };
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":")) {
    return { host, level: "danger", note: "Goes to a bare server address, not a website name" };
  }
  if (host.split(".").some((p) => p.startsWith("xn--"))) {
    return { host, level: "danger", note: "Uses look-alike letters in the web address" };
  }
  if (SHORTENERS.some((d) => matches(host, d))) {
    return { host, level: "danger", note: "Shortened link hides where it really goes — ask for the full link" };
  }

  const seller = TICKET_SELLERS.find((d) => matches(host, d));
  if (seller) {
    return parsed.protocol === "http:"
      ? { host, level: "check", note: "Known seller, but the link isn't secure (http)" }
      : { host, level: "ok", note: null };
  }

  const social = SOCIAL.some((d) => matches(host, d));
  const b = brand(host);
  const known = [...TICKET_SELLERS, ...SOCIAL].filter((d) => brand(d).length >= 5);
  const sameName = social ? undefined : known.find((d) => brand(d) === b);
  if (sameName) {
    return { host, level: "check", note: `Same name as ${sameName} but a different web address — make sure it's the official site` };
  }
  const lookalike = social
    ? undefined
    : known.find((d) => {
        const k = brand(d);
        return distance(b, k) <= 2 || (k.length >= 6 && b.includes(k));
      });
  if (lookalike) {
    return { host, level: "danger", note: `Looks like ${lookalike} but isn't — possible fake ticket site` };
  }

  if (social) {
    return { host, level: "check", note: "Booking by message/social page — check the account is really theirs" };
  }
  return {
    host,
    level: "check",
    note: parsed.protocol === "http:" ? "Unknown website, not secure (http) — open it and check" : "Unknown website — open it and check before approving",
  };
}
