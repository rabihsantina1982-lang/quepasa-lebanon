/**
 * POST /api/promoter/parse-caption
 * Body: { caption: string }
 * Promoters/admins paste an Instagram caption (Arabic, English, French or a
 * mix); Claude pulls out the event details so the "Post a new event" form can
 * be pre-filled. Nothing is saved here: the promoter reviews and submits.
 * Needs ANTHROPIC_API_KEY in the environment.
 */
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_TAGS } from "@/lib/tags";

const MAX_CAPTION = 6000;

// This app's regions (stored in events.governorate).
const REGIONS = ["beirut", "mount_lebanon", "north_lebanon", "south_lebanon", "bekaa", "nabatieh", "akkar", "baalbek_hermel"] as const;
const COUNTRY = "Lebanon";
const TIMEZONE = "Asia/Beirut";
const CURRENCY = "USD";

const CATEGORIES = [
  "live_music", "dj_performance", "sports", "food_drink", "arts_culture", "theater", "family_kids",
  "nightlife", "wellness", "festivals", "conferences", "workshops", "exhibitions", "outdoor", "religious", "charity",
] as const;

const EventDetails = z.object({
  is_event: z.boolean().describe("false if the post is not announcing a specific upcoming event"),
  title: z.string().describe("Short event title, e.g. 'Hiba Tawaji Live' (no emojis, no hashtags)"),
  description: z.string().describe("1-3 sentence summary written for an events listing, in the post's main language (prefer English if the post has English). No hashtags."),
  category: z.enum(CATEGORIES),
  tags: z.array(z.string()).describe("Sub-filters from the allowed list for the chosen category only"),
  performances: z
    .array(z.object({
      date: z.string().describe("YYYY-MM-DD"),
      start_time: z.string().nullable().describe("HH:MM 24h local time, or null if not stated"),
    }))
    .describe("One entry per separate date/show. A continuous multi-day festival is ONE entry for its first day plus end_date."),
  end_date: z.string().nullable().describe("YYYY-MM-DD last day of a continuous multi-day event, else null"),
  end_time: z.string().nullable().describe("HH:MM 24h if an end time is stated, else null"),
  venue_name: z.string().nullable(),
  area: z.string().nullable().describe("Neighbourhood or town, e.g. Mar Mikhael, Jounieh"),
  region: z.enum(REGIONS).nullable(),
  price_min: z.number().nullable().describe(`Lowest ticket price in ${CURRENCY}; 0 if free entry; null if not stated`),
  price_max: z.number().nullable(),
  ticket_url: z.string().nullable().describe("Ticket/booking link if present in the text"),
  booking_phone: z.string().nullable().describe("Phone/WhatsApp number for bookings if present"),
  missing: z.array(z.string()).describe("Short notes on important details the post does not state (e.g. 'start time', 'year'), in English"),
});

const SYSTEM = `You extract event details from social media posts (mostly Instagram captions) for an events listing app in ${COUNTRY}.
Posts mix Arabic, English and French, and use emojis, abbreviations and Arabizi. Read them carefully.

Rules:
- Only use information that is in the post. Never invent a venue, price, time or link. Use null when something is not stated, and list it in "missing".
- Dates: resolve relative or partial dates ("this Friday", "Sat 17/10", "17 Oct") against the TODAY date given with the post, always choosing the next upcoming occurrence. Day-first is the norm (17/10 = 17 October).
- Times are local ${COUNTRY} time; convert to 24h HH:MM. If both "doors" and "show" times are given, use the show start.
- Prices: convert to numbers in ${CURRENCY}. If prices are only in another currency, put null and mention it in "missing".
- Category guidance: plays, musicals, ballet and stand-up comedy are "theater"; DJ nights and club events with a DJ lineup are "dj_performance"; parties without a named DJ lineup are "nightlife"; markets and food events are "food_drink"; art shows are "exhibitions".
- Allowed tags per category (use only these, only for the chosen category, and only when clearly true): ${JSON.stringify(CATEGORY_TAGS)}. A comedy play is "play"; "comedy" means stand-up only.
- region must be one of: ${REGIONS.join(", ")}; pick it from the venue's town when you are confident, else null.
- If the post is not about a specific upcoming event (e.g. a menu, a throwback, a general promo), set is_event to false and fill the rest as best you can.`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role, suspended_at").eq("id", user.id).single();
  if ((profile?.role !== "promoter" && profile?.role !== "admin") || profile?.suspended_at) {
    return NextResponse.json({ error: "Promoters only" }, { status: 403 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Auto-fill isn't switched on yet. Please fill in the form by hand." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const caption = typeof body.caption === "string" ? body.caption.trim() : "";
  if (caption.length < 15) return NextResponse.json({ error: "Paste the full post text first." }, { status: 400 });
  if (caption.length > MAX_CAPTION) return NextResponse.json({ error: "That text is too long. Paste just the event post." }, { status: 400 });

  const today = new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date());

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(EventDetails) },
      system: SYSTEM,
      messages: [{ role: "user", content: `TODAY: ${today}\n\nPOST:\n${caption}` }],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return NextResponse.json({ error: "Couldn't read this post. Please fill in the form by hand." }, { status: 422 });
    }

    const out = response.parsed_output;
    // Keep only tags that really belong to the chosen category.
    const allowed = CATEGORY_TAGS[out.category] ?? [];
    return NextResponse.json({ ...out, tags: out.tags.filter((t) => allowed.includes(t)) });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Too many requests right now. Try again in a minute." }, { status: 429 });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("parse-caption: invalid ANTHROPIC_API_KEY");
      return NextResponse.json({ error: "Auto-fill isn't available right now. Please fill in the form by hand." }, { status: 503 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("parse-caption: API error", err.status, err.message);
      return NextResponse.json({ error: "Auto-fill failed. Please try again or fill in the form by hand." }, { status: 502 });
    }
    throw err;
  }
}
