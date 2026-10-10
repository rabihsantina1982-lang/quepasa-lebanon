// Words and links in a submitted event that often mean a ticket scam:
// payment outside a proper ticket page. Shown to the admin in the review
// queue; they are warnings to look closer, not proof.

import { checkTicketLink, type LinkLevel } from "./ticketLinks";

export interface ScamSignal {
  level: Exclude<LinkLevel, "ok">;
  note: string;
}

const BY_MESSAGE = "Booking by message";

const PATTERNS: { re: RegExp; level: ScamSignal["level"]; note: string }[] = [
  { re: /bank transfer|wire transfer|\biban\b|account (number|no\.?)|swift code|تحويل بنكي|حوالة|رقم الحساب|virement|\brib\b/i, level: "danger", note: "Asks for a bank transfer" },
  { re: /crypto|bitcoin|\bbtc\b|\busdt\b|tether|binance|\beth\b wallet/i, level: "check", note: "Mentions crypto (normal for crypto events; check how they take payment)" },
  { re: /gift ?cards?|itunes card|google play card|بطاقة هدايا/i, level: "check", note: "Mentions gift cards" },
  { re: /western union|moneygram|send money|money transfer|whish money|\bomt\b|ويسترن يونيون/i, level: "danger", note: "Asks to send money" },
  { re: /(dm|inbox|message|whatsapp|text|call)\s+(us|me)?\s*(to|for)\s+(book|buy|order|reserve|pay|tickets?)|(راسلنا|واتساب) (للحجز|للشراء)/i, level: "check", note: BY_MESSAGE },
  { re: /pay (in advance|upfront|a deposit)|advance payment|deposit (required|to secure)|دفعة مقدمة|عربون/i, level: "check", note: "Asks for payment in advance" },
];

const URL_RE = /https?:\/\/[^\s<>"')]+/gi;

export function scamSignals(text: string, hasTicketLink: boolean): ScamSignal[] {
  const found: ScamSignal[] = [];
  for (const p of PATTERNS) {
    // Booking by message is normal (restaurants, small venues) when there is
    // also a proper ticket link; it's a warning only on its own.
    if (p.note === BY_MESSAGE && hasTicketLink) continue;
    if (p.re.test(text)) found.push({ level: p.level, note: p.note === BY_MESSAGE ? `${BY_MESSAGE}, with no ticket link` : p.note });
  }
  // Links in the description get the same check as ticket links.
  for (const url of new Set(text.match(URL_RE) ?? [])) {
    const c = checkTicketLink(url);
    if (c.level === "danger") found.push({ level: "danger", note: `Link in the description: ${c.host}${c.note ? ` (${c.note})` : ""}` });
  }
  return found;
}
