// Organiser verification helpers: the admin checklist, document types, and
// the "does their email belong to their website" hint.

export const VERIFICATION_CHECKS = [
  { key: "instagram", label: "Saw the code in their Instagram bio" },
  { key: "phone", label: "Called or messaged their phone and they confirmed" },
  { key: "website", label: "Website and email belong to the business" },
  { key: "documents", label: "Checked their documents (licence, permit or ID)" },
] as const;
export type CheckKey = (typeof VERIFICATION_CHECKS)[number]["key"];
// Who ticked it and when.
export type Checks = Partial<Record<CheckKey, { at: string; by: string }>>;

export function isCheckKey(v: unknown): v is CheckKey {
  return VERIFICATION_CHECKS.some((c) => c.key === v);
}

export const DOC_KINDS = [
  { key: "trade_licence", label: "Trade licence" },
  { key: "event_permit", label: "Event permit" },
  { key: "id", label: "ID (national ID, passport…)" },
  { key: "other", label: "Other" },
] as const;
export type DocKind = (typeof DOC_KINDS)[number]["key"];

export const DOC_MAX_BYTES = 10 * 1024 * 1024;
export const DOC_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic"];

// Free webmail: fine for a person, but says nothing about a business.
const PERSONAL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "outlook.com", "live.com", "msn.com", "yahoo.com", "ymail.com",
  "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com", "gmx.com", "mail.com", "yandex.com", "zoho.com",
]);

function websiteHost(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    return new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export type EmailMatch = { level: "match" | "personal" | "different" | "unknown"; text: string };

// Whether the applicant's sign-in email is on their website's domain
// (info@theirvenue.com with theirvenue.com): a strong sign the business is real.
export function emailWebsiteMatch(email: string | null | undefined, website: string | null | undefined): EmailMatch {
  const domain = email?.split("@")[1]?.toLowerCase();
  const host = websiteHost(website);
  if (!domain) return { level: "unknown", text: "No email on file" };
  if (PERSONAL_DOMAINS.has(domain)) {
    return { level: "personal", text: `Personal email (${domain})${host ? `, website ${host}` : ", no website"}` };
  }
  if (!host) return { level: "unknown", text: `Business email (${domain}), no website given` };
  const same = domain === host || host.endsWith(`.${domain}`) || domain.endsWith(`.${host}`);
  return same
    ? { level: "match", text: `Email matches website (${domain})` }
    : { level: "different", text: `Email ${domain} doesn't match website ${host}` };
}
