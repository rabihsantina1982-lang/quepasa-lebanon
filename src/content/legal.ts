// Terms and policies shown at /legal/<slug>. DRAFT (written 11 Oct 2026, not
// yet reviewed by a lawyer): replace the text here once the final version is
// ready, fill the [bracketed] details, and set DRAFT to false.
// Format: "## " heading, "- " bullet, blank line between paragraphs.

export const DRAFT = true;

const PLACE: Record<string, string> = {
  "[Country]": "Lebanon",
  "[Courts of]": "courts of Beirut",
};

export const LEGAL_SLUGS = ["terms", "privacy", "organiser-terms", "guidelines", "promotion-terms", "cookies"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

const DOCS: Record<LegalSlug, { title: string; body: string }> = {
  terms: {
    title: "Website Terms of Use",
    body: `
These terms apply to everyone who visits or uses QuePasa at [Website] (the "Service"), run by [Company legal name], [Registered address] ("QuePasa", "we", "us"). By using the Service you agree to them.

## 1. What QuePasa is
QuePasa is a guide to events in [Country]. We list events posted by organisers and events gathered from public sources such as official ticket sellers. We do not sell tickets, organise events or take payment for tickets. When you click "Get tickets" or "Call to book", you deal directly with the organiser or ticket seller, under their terms.

## 2. Your account
- You need to be at least 18 to create an account.
- You can sign in with an email link, Google or Facebook. Keep access to that email or account secure; you are responsible for what happens under your account.
- Give accurate information. Optional profile details (age, gender, interests) help us show you relevant events; you can leave them blank.
- You can delete your account at any time from My account.

## 3. Using the Service fairly
You agree not to:
- post or report anything false, misleading or abusive;
- use bots, scripts or fake accounts, or try to inflate views, clicks or reports;
- copy large parts of the Service, or scrape it automatically;
- try to break, overload or get around the Service's security;
- use the Service for anything unlawful.

We may suspend or close accounts that break these rules.

## 4. Event information
Organisers are responsible for their listings. We check new listings before they go live, but we cannot guarantee that every date, price, venue or ticket link is correct, or that an event will happen. Always confirm details with the organiser or ticket seller before you pay or travel. Pay only through official ticket links or at the venue; never send money by bank transfer or to someone who contacts you by message.

## 5. Reporting a problem
Use "Report this event" on any event page, or email [Contact email]. We review reports, and an event reported by several people may be hidden while we check it.

## 6. Our content
The QuePasa name, logo, design and software belong to us. Event names, photos and descriptions belong to the organisers who supplied them.

## 7. Liability
The Service is provided "as is". To the extent the law allows, QuePasa is not liable for events, tickets, purchases or anything else arranged between you and an organiser or ticket seller, or for losses from relying on listing information. Nothing in these terms limits liability that cannot be limited by law.

## 8. Changes
We may update these terms. We will change the date at the top and, for significant changes, tell signed-in users. Continuing to use the Service means you accept the update.

## 9. Law and contact
These terms are governed by the laws of [Country], and disputes go to the [Courts of]. Questions: [Contact email].
`,
  },
  "organiser-terms": {
    title: "Organiser Terms",
    body: `
These terms apply to promoters, venues and businesses ("Organisers") who apply for an organiser account or list events on QuePasa. They add to the Website Terms of Use. By applying or posting an event you agree to them.

## 1. Applying and verification
- You must be at least 18 and authorised to act for the business you name.
- Give accurate details: business name, type, Instagram account, phone number and, if you have one, website.
- To confirm you control the Instagram account, we ask you to place a short code in its bio until we approve you. You can remove it afterwards.
- We may approve, decline, or ask for more information at our discretion. A Verified badge means we checked who runs the account; it is not an endorsement of your events.

## 2. Listing events
Listing is free and unlimited. For every event you post, you confirm that:
- the event is real, and you organise it or are authorised to promote it;
- the date, time, venue, price and description are accurate, and you will keep them accurate (or tell us) if anything changes;
- the ticket link or booking phone is yours or an official seller's, and takes buyers to a genuine way to book;
- you own, or have permission to use, every photo, video, logo and text you upload;
- the event and its promotion follow the law of [Country] and our Listing and Community Guidelines.

Every new listing is reviewed before it goes live. We may edit obvious errors, decline, hide or remove any listing.

## 3. Tickets and payments
QuePasa does not sell tickets or take payment for them. You are fully responsible for ticket sales, refunds, cancellations, entry and the event itself. Never ask buyers to pay by bank transfer, money-transfer service, crypto or gift card, or to pay someone who contacts them by message. Listings that do so will be removed and the account suspended.

## 4. Content licence
You keep ownership of what you upload. You give QuePasa a free, non-exclusive licence to show, resize, translate and share it on the Service and in our promotion of your event, such as the weekly weekend posts on Instagram and WhatsApp, for as long as the listing is up and a reasonable time after.

## 5. Statistics
We show you views and saves for your events, and the results of any Boost or Spotlight you buy. With Pro you also get ticket clicks, reminders, shares, where your viewers come from (for example a WhatsApp link, Google or Instagram), the language they browse in, the device they use, and audience age and gender, on your dashboard and in a weekly email while Pro is active. All figures are totals about your own events only; we never give you the names or contact details of people who viewed or saved your events, and a breakdown only appears once it covers at least 10 visits or 10 people. Your ticket links carry a QuePasa tag (utm_source=quepasa) so your ticketing provider's own reports can show the visits and sales that came from QuePasa.

## 6. Suspension and removal
We may hide events, remove your Verified badge, or suspend or close your account if you break these terms, if we receive credible reports of fraud or misleading listings, or to protect visitors. Where it is safe to, we will tell you why. Suspension hides all your events and stops new posts and promotion requests.

## 7. Responsibility
You are responsible for your events and listings. You agree to cover QuePasa's reasonable costs and losses from claims caused by your listing, your event, or your breach of these terms, to the extent the law allows.

## 8. Ending
You can delete any of your events from your dashboard, and delete your account (with all your events) from My account at any time, or email [Contact email]. Paid promotions already running are covered by the Paid Promotion Terms.
`,
  },
  guidelines: {
    title: "Listing and Community Guidelines",
    body: `
QuePasa works when people can trust what they find. These rules apply to every listing, photo, profile and report.

## Welcome
Real, public events in [Country] that people can attend or book: concerts, nightlife, theatre, comedy, sport, family days, exhibitions, festivals, food and drink, wellness, workshops, conferences, charity and community events.

## Not allowed
- Fake or misleading events: events that aren't happening, wrong dates or venues, bait-and-switch prices.
- Unsafe payment requests: bank transfer, money-transfer services, crypto or gift cards; "DM to pay"; deposits to individuals.
- Pretending to be someone else: using another promoter's or venue's name, logo or Instagram.
- Resale and touting: reselling tickets above face value, or where the organiser forbids it.
- Illegal or unsafe activity: anything breaking the law of [Country], including drugs, weapons and unlicensed gambling.
- Offensive content: hate, harassment, sexual content, or content offensive to public morals in [Country].
- Content you don't have rights to: other people's photos, videos, artwork or brand names without permission.
- Spam: duplicate listings, keyword stuffing, listings that are really adverts.

## Photos and text
- Use clear photos or videos of the event, venue or performers you have permission to use.
- Write the description yourself: who, what, when, where and price. No all-caps titles, no misleading words like "free" for paid events.

## How we check
- Every new listing is reviewed by our team before it goes live.
- We look for warning signs such as unknown or shortened ticket links, unsafe payment requests and events that are already listed.
- We verify organisers who apply, and mark checked ones with a Verified badge.

## Reports and removals
- Anyone signed in can use "Report this event". Reports are private: we don't tell the organiser who reported.
- If several different people report the same event, it is hidden automatically until we review it.
- We may restore, edit, hide or remove the listing, and suspend organisers who break the rules. Serious fraud may be reported to the authorities.
- False or malicious reporting is itself against the rules.

## Disagree with a decision?
Email [Contact email] with the event name and why you think we got it wrong. We'll review it and reply.
`,
  },
  "promotion-terms": {
    title: "Paid Promotion Terms",
    body: `
Listing events on QuePasa is free. Organisers can pay for extra visibility. These terms add to the Organiser Terms.

## What you can buy
- Boost (USD 15 per week): your event pinned near the top of Browse, with a "Featured" badge.
- Homepage Spotlight (USD 35 per week): your event in the banner above the events grid on the main events page.
- Pro (USD 25 per month): full statistics (ticket clicks, reminders, shares, where viewers come from, their language and device, audience age and gender) on your dashboard and in a weekly email, first place in Connect, and 1 free Boost week each calendar month.

New organisers get Pro free for their first 3 months after approval. Prices may include or exclude VAT as required by law [to be confirmed].

## How it works
- You choose Boost or Spotlight when you post an event, or later from your organiser dashboard, and pick the dates on a calendar that shows how many places are left each day.
- You pay by card through our secure payment provider when you book, or send a request and pay by [payment method]; we then confirm it.
- Your event must be approved before the promotion appears. If we don't approve it, card payments are refunded in full automatically.
- The promotion runs for the dates booked and ends automatically.

## Labelling
Paid placements are marked "Featured" so visitors know they are promoted. Payment never buys a Verified badge, approval of a listing, or protection from removal.

## No guaranteed results
Promotion increases visibility. We do not promise a number of views, clicks or ticket sales.

## Refunds and cancellations
- We decline your request: you pay nothing, or get a full refund.
- We remove your event for reasons that aren't your fault (for example a mistake on our side): refund for the unused days, or the same time moved to another event.
- Your event is cancelled by you, or removed for breaking our rules: no refund.
- Pro: cancel at any time; it stays active until the end of the paid month and does not renew.

## Price changes
We may change prices with at least 14 days' notice. Changes never apply to a period you have already paid for.
`,
  },
  privacy: {
    title: "Privacy Policy",
    body: `
This policy explains what personal data QuePasa collects, why, who we share it with and your choices. [Company legal name], [Registered address], is responsible for your data. Contact: [Contact email].

In short: we collect what we need to run an events guide, we never sell your data, and we don't use advertising trackers.

## What we collect and why
- Account details: email, name and profile photo (from Google or Facebook if you sign in that way), language. Why: to sign you in and run your account. Kept: until you delete your account.
- Optional profile: date of birth, gender, interests. Why: to suggest events, and to show organisers anonymous audience totals. Kept: until you remove them or delete your account.
- Your activity: saved events, reminders, shares, reports you make. Why: to provide those features and keep listings honest. Kept: until you delete them or your account.
- Event statistics: event views, ticket-link clicks, shares, and for each visit where it came from (for example a WhatsApp link, Google, Instagram or a page on QuePasa), the language you browse in and whether you use a phone, tablet or computer. Why: to show organisers how their events perform, stop fake counts, and help us understand the events market and improve QuePasa. If you aren't signed in, we use a scrambled one-way code made from your connection and browser; we do not store your IP address. Kept: up to [24 months], then deleted or anonymised.
- Organiser details: business name and type, Instagram, phone, website, description, logo, verification code, events posted. Why: to review applications, verify organisers and publish listings. Kept: while the organiser account is open, plus [12 months].
- Pasted captions: text an organiser pastes into "Paste from Instagram". Why: to fill in the event form automatically. Kept: not stored by us after the form is filled.
- Messages: emails you send us. Why: to answer you. Kept: [24 months].

## Reminder and service emails
If you set a reminder, we email you before the event. We send account emails such as sign-in links. We don't send marketing emails without asking first.

## What organisers see
Organisers see totals only, and only about their own events: for example views, saves, clicks, where visitors came from, the languages and devices used, and the age and gender mix of their audience. Detailed figures go only to organisers with an active Pro subscription, on their dashboard and in a weekly email. A breakdown only appears once it covers at least 10 visits or 10 people, so no one can be singled out. Organisers never see your name, email or which events you saved.

## How we use statistics ourselves
Our team uses the same anonymous figures, across all events, to understand what people look for, which kinds of events and areas are popular, and how to improve QuePasa. These figures are for our internal use and are not sold.

## Who we share data with
We use these providers to run the Service. They process data on our instructions only:
- Supabase: database, sign-in and file storage
- Vercel: website hosting
- Cloudflare: bot check on sign-in
- Resend: sending emails
- Google, Facebook: sign-in, only if you choose them
- Mapbox: maps and directions
- Anthropic: reading pasted captions for "Paste from Instagram"

We may also share data if the law requires it, to protect people from fraud or harm, or as part of a sale or merger of the business. We never sell personal data.

Some providers store data outside [Country], including in [Supabase region] and the United States. We choose providers with strong security and data-protection commitments.

## Backups and security
Data travels encrypted, access is limited by account and role, and only our admins can see private details. We keep weekly backups for about two months to recover from mistakes; deleted data disappears from backups as they roll over.

## Your rights
You can ask to see, correct, download or delete your data, withdraw consent for optional details, or object to how we use it. Delete your account at any time from My account, or email [Contact email]. We reply within 30 days. You can also complain to the data-protection authority in [Country].

## Children
QuePasa is for people aged 18 and over. We don't knowingly collect data from children; if we learn we have, we delete it.

## Changes
We'll update the date at the top and tell signed-in users about significant changes.
`,
  },
  cookies: {
    title: "Cookie Notice",
    body: `
QuePasa only uses cookies and browser storage that the site needs to work. We use no advertising or tracking cookies, so there is no cookie banner to accept.

- Sign-in cookie (QuePasa / Supabase): keeps you signed in. Lasts until you sign out or the session expires.
- Language cookie (QuePasa): remembers your language. Lasts up to 1 year.
- Cloudflare Turnstile (Cloudflare): checks you're human when you sign in by email. Only during the check.
- Mapbox storage (Mapbox): makes maps load and work properly. Set by Mapbox.

You can delete cookies in your browser settings at any time. If you block them, you won't be able to stay signed in.

If we ever add analytics or advertising cookies, we will update this notice and ask for your consent first.
`,
  },
};

export type LegalBlock = { kind: "h" | "p"; text: string } | { kind: "ul"; items: string[] };

export function legalDoc(slug: LegalSlug): { title: string; blocks: LegalBlock[] } {
  const { title, body } = DOCS[slug];
  const filled = Object.entries(PLACE).reduce((s, [k, v]) => s.split(k).join(v), body.trim());
  const blocks: LegalBlock[] = [];
  for (const para of filled.split(/\n\s*\n/)) {
    for (const line of para.split("\n")) {
      if (line.startsWith("## ")) blocks.push({ kind: "h", text: line.slice(3) });
      else if (line.startsWith("- ")) {
        const last = blocks[blocks.length - 1];
        if (last?.kind === "ul") last.items.push(line.slice(2));
        else blocks.push({ kind: "ul", items: [line.slice(2)] });
      } else if (line.trim()) blocks.push({ kind: "p", text: line });
    }
  }
  return { title, blocks };
}

export const legalTitle = (slug: LegalSlug) => DOCS[slug].title;
