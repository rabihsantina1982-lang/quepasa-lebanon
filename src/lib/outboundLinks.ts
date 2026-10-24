// Tags outgoing ticket links with QuePasa as the source, so organisers can see
// in their own ticketing site's stats how many visits and sales came from us.
// Links that already carry a source tag, phone links and WhatsApp links are
// left alone.

const UNTAGGED_HOSTS = ["wa.me", "api.whatsapp.com", "chat.whatsapp.com"];

export function withQuePasaTag(url: string, campaign?: string): string {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return url;
    if (UNTAGGED_HOSTS.includes(u.hostname) || u.searchParams.has("utm_source")) return url;
    u.searchParams.set("utm_source", "quepasa");
    u.searchParams.set("utm_medium", "referral");
    if (campaign) u.searchParams.set("utm_campaign", campaign);
    return u.toString();
  } catch {
    return url;
  }
}

// Adds a query parameter to one of our own share links (e.g. ?via=whatsapp),
// so a visit through it can be counted as coming from that share.
export function withParam(url: string, key: string, value: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set(key, value);
    return u.toString();
  } catch {
    return url;
  }
}
