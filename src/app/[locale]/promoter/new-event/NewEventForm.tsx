"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { Upload, X, Video, Plus } from "lucide-react";
import Image from "next/image";
import { DatePicker, TimePicker } from "@/components/ui/DateTimePicker";

const inputCls = "w-full h-11 px-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-sm outline-none focus:border-[var(--color-primary)] transition-colors";
const textareaCls = "w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-sm outline-none focus:border-[var(--color-primary)] transition-colors resize-none";

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">
        {label} {required && <span className="text-[var(--color-danger)]">*</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-[var(--color-muted)]">{hint}</span>}
    </label>
  );
}

type MediaFile = { file: File; preview: string; type: "image" | "video" };
type ExistingMedia = { url: string; kind: "image" | "video" };

// Pre-fill values when duplicating an existing event (dates excluded).
export type NewEventInitial = {
  title: string; description: string; category_id: string; governorate: string;
  ticket_url: string; booking_phone: string; price_min: string; price_max: string;
  venue_name: string; venue_area: string; media: ExistingMedia[];
};

// single = one day; range = one continuous run (e.g. a 3-day festival);
// dates = separate performances on several dates (e.g. every Friday), saved
// as ONE event with each date in `showtimes`.
type DurationMode = "single" | "range" | "dates";
type Category = { id: string; slug: string; name_i18n: Record<string, string> };

const CATEGORY_LABELS: Record<string, string> = {
  live_music: "Live Music", dj_performance: "DJ Performance", sports: "Sports",
  food_drink: "Food & Drink", arts_culture: "Arts & Culture", theater: "Theater", family_kids: "Family & Kids",
  nightlife: "Nightlife", wellness: "Wellness",
  festivals: "Festivals", conferences: "Conferences & Expos", workshops: "Workshops",
  exhibitions: "Exhibitions", outdoor: "Outdoor", religious: "Religious", charity: "Charity",
};

export function NewEventForm({ initial }: { initial?: NewEventInitial }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [media, setMedia] = useState<MediaFile[]>([]);
  // Photos/video carried over from a duplicated event (already uploaded).
  const [existingMedia, setExistingMedia] = useState<ExistingMedia[]>(initial?.media ?? []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mode, setMode] = useState<DurationMode>("single");
  const isMultiDay = mode === "range";
  const [showDates, setShowDates] = useState<string[]>(["", ""]);

  const [form, setForm] = useState({
    title: initial?.title ?? "", description: initial?.description ?? "", starts_at: "", ends_at: "",
    venue_name: initial?.venue_name ?? "", venue_area: initial?.venue_area ?? "", governorate: initial?.governorate ?? "", category_id: initial?.category_id ?? "",
    ticket_url: initial?.ticket_url ?? "", booking_phone: initial?.booking_phone ?? "", price_min: initial?.price_min ?? "", price_max: initial?.price_max ?? "",
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.from("categories").select("id, slug, name_i18n").order("slug").then(({ data }) => {
      if (data) setCategories(data as Category[]);
    });
  }, []);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function mergeDate(existing: string, datePart: string) {
    const timePart = existing ? existing.slice(11) : "12:00";
    return `${datePart}T${timePart}`;
  }

  function setSingleDayDate(value: string) {
    const datePart = value.slice(0, 10);
    setForm((prev) => ({
      ...prev,
      starts_at: mergeDate(prev.starts_at, datePart),
      ends_at: mergeDate(prev.ends_at, datePart),
    }));
  }

  function chooseMode(next: DurationMode) {
    setMode(next);
    if (next === "single") {
      setForm((prev) => {
        if (!prev.starts_at) return prev;
        const datePart = prev.starts_at.slice(0, 10);
        return { ...prev, ends_at: mergeDate(prev.ends_at, datePart) };
      });
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setError("");

    const currentHasVideo = media.some((m) => m.type === "video") || existingMedia.some((m) => m.kind === "video");
    const existingImages = existingMedia.filter((m) => m.kind === "image").length;
    const existingCount = existingMedia.length;
    const newMedia: MediaFile[] = [];

    for (const file of files) {
      const isVideo = file.type.startsWith("video/");
      if (isVideo && (currentHasVideo || existingCount > 0 || media.length > 0 || newMedia.length > 0)) {
        setError("Upload 1 video OR up to 3 photos — not both.");
        return;
      }
      if (!isVideo && existingImages + media.filter((m) => m.type === "image").length + newMedia.filter(m => m.type === "image").length >= 3) {
        setError("Maximum 3 photos allowed.");
        return;
      }
      if (isVideo && file.size > 100 * 1024 * 1024) {
        setError("Video must be under 100MB.");
        return;
      }
      newMedia.push({ file, preview: URL.createObjectURL(file), type: isVideo ? "video" : "image" });
    }

    setMedia((prev) => [...prev, ...newMedia]);
    e.target.value = "";
  }

  function removeMedia(index: number) {
    setMedia((prev) => { URL.revokeObjectURL(prev[index].preview); return prev.filter((_, i) => i !== index); });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // "Several dates": every row needs a date; at least two dates.
    const pickedDates = mode === "dates"
      ? [...new Set(showDates.filter(Boolean))].sort()
      : [];
    if (mode === "dates" && pickedDates.length < 2) {
      setError("Pick at least two dates, or choose \"Single day\" instead.");
      return;
    }
    if (mode !== "dates" && !form.starts_at) {
      setError("Please pick the event date.");
      return;
    }

    setSubmitting(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Please sign in."); setSubmitting(false); return; }

    try {
      // 1. Upload media
      const uploaded: { url: string; kind: "image" | "video" }[] = [...existingMedia];
      for (const m of media) {
        const ext = m.file.name.split(".").pop();
        const path = `events/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("event-media").upload(path, m.file, { contentType: m.file.type });
        if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);
        const { data: { publicUrl } } = supabase.storage.from("event-media").getPublicUrl(path);
        uploaded.push({ url: publicUrl, kind: m.type });
      }

      // 2. Upsert venue
      const { data: venue, error: venueErr } = await supabase
        .from("venues").insert({ name: form.venue_name, area: form.venue_area || null, city: form.governorate || "Beirut" })
        .select().single();
      if (venueErr) throw new Error(venueErr.message);

      // 3. Insert event
      const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60) + "-" + Date.now().toString(36);
      const { data: event, error: eventErr } = await supabase.from("events").insert({
        slug,
        title_i18n: { en: form.title },
        description_i18n: { en: form.description },
        user_id: user.id,
        created_by: user.id,
        venue_id: (venue as { id: string }).id,
        governorate: form.governorate || null,
        category_id: form.category_id || null,
        ...(mode === "dates"
          ? {
              starts_at: new Date(pickedDates[0]).toISOString(),
              ends_at: new Date(pickedDates[pickedDates.length - 1]).toISOString(),
              showtimes: pickedDates.map((d) => ({
                starts_at: new Date(d).toISOString(),
                ends_at: null,
                ticket_url: form.ticket_url || null,
              })),
            }
          : {
              starts_at: new Date(form.starts_at).toISOString(),
              ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
            }),
        ticket_url: form.ticket_url || null,
        booking_phone: form.booking_phone || null,
        price_min: form.price_min ? Number(form.price_min) : null,
        price_max: form.price_max ? Number(form.price_max) : null,
        cover_image: uploaded.find((m) => m.kind === "image")?.url ?? null,
        status: "pending",
        source: "promoter",
      }).select().single();
      if (eventErr) throw new Error(eventErr.message);

      // 4. Insert media records
      if (uploaded.length > 0) {
        await supabase.from("event_media").insert(
          uploaded.map((m, i) => ({ event_id: (event as { id: string }).id, url: m.url, kind: m.kind, position: i, provider: "upload" }))
        );
      }

      // 5. Track post usage (for Standard plan limit)
      await supabase.rpc("increment_posts_used", { p_user_id: user.id });

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold">Event submitted!</h1>
        <p className="mt-3 text-[var(--color-muted)]">Your event is under review and will be published within 24 hours.</p>
        <div className="mt-6 flex gap-3 justify-center">
          <Button variant="primary" onClick={() => router.push("/promoter")}>Back to dashboard</Button>
          <Button variant="outline" onClick={() => { setSubmitted(false); setMedia([]); setExistingMedia([]); }}>Post another</Button>
        </div>
      </div>
    );
  }

  const hasVideo = media.some((m) => m.type === "video") || existingMedia.some((m) => m.kind === "video");
  const canAddMore = !hasVideo && existingMedia.length + media.length < 3;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">{initial ? "Duplicate event" : "Post a new event"}</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        {initial
          ? "Everything is copied from your earlier event. Just pick the new date(s), check the details, and submit."
          : "Fill in the details below. Your event is reviewed before it goes live."}
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Media upload */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Photos or video</span>
          <p className="text-xs text-[var(--color-muted)]">Up to 3 photos OR 1 short video (max 100MB)</p>
          <div className="flex flex-wrap gap-3">
            {existingMedia.map((m, i) => (
              <div key={m.url} className="relative w-28 h-28 rounded-lg overflow-hidden border border-[var(--color-border)]">
                {m.kind === "image"
                  ? <Image src={m.url} alt="" fill className="object-cover" sizes="112px" />
                  : <div className="w-full h-full bg-black flex items-center justify-center"><Video size={24} className="text-white" /></div>
                }
                <button type="button" onClick={() => setExistingMedia((prev) => prev.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white">
                  <X size={12} />
                </button>
              </div>
            ))}
            {media.map((m, i) => (
              <div key={i} className="relative w-28 h-28 rounded-lg overflow-hidden border border-[var(--color-border)]">
                {m.type === "image"
                  ? <Image src={m.preview} alt="" fill className="object-cover" />
                  : <div className="w-full h-full bg-black flex items-center justify-center"><Video size={24} className="text-white" /></div>
                }
                <button type="button" onClick={() => removeMedia(i)} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white">
                  <X size={12} />
                </button>
              </div>
            ))}
            {canAddMore && (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-28 h-28 rounded-lg border-2 border-dashed border-[var(--color-border)] flex flex-col items-center justify-center text-[var(--color-muted)] hover:border-[var(--color-primary)] transition-colors text-xs gap-1">
                <Upload size={20} /><span>Add media</span>
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
            multiple={!hasVideo} className="hidden" onChange={handleFileSelect} />
        </div>

        <Field label="Event title" required>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} required />
        </Field>

        <Field label="Description" required>
          <textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} className={textareaCls} required />
        </Field>

        <Field label="Category" required>
          <select value={form.category_id} onChange={(e) => set("category_id", e.target.value)} className={inputCls} required>
            <option value="">— select a category —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_i18n?.en ?? CATEGORY_LABELS[c.slug] ?? c.slug}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Event duration" required>
          <div className="grid grid-cols-3 gap-2">
            {([
              ["single", "Single day"],
              ["range", "Multiple days"],
              ["dates", "Several dates"],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => chooseMode(value)}
                className={`h-11 rounded-md border text-sm font-medium transition-colors ${
                  mode === value
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                    : "border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-bg)]"
                }`}>
                {label}
              </button>
            ))}
          </div>
          {mode !== "single" && (
            <span className="text-xs text-[var(--color-muted)]">
              {mode === "range"
                ? "One continuous run, e.g. a 3-day festival."
                : "Separate dates, e.g. every Friday or a run of shows. Listed as one event with all its dates."}
            </span>
          )}
        </Field>

        {mode === "dates" ? (
          <div className="space-y-2">
            <span className="text-sm font-medium">Dates &amp; start times <span className="text-[var(--color-danger)]">*</span></span>
            {showDates.map((d, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <DatePicker value={d} onChange={(v) => setShowDates((prev) => prev.map((x, j) => (j === i ? v : x)))} />
                <TimePicker value={d} onChange={(v) => setShowDates((prev) => prev.map((x, j) => (j === i ? v : x)))} />
                <button type="button" aria-label="Remove date" disabled={showDates.length <= 2}
                  onClick={() => setShowDates((prev) => prev.filter((_, j) => j !== i))}
                  className="h-11 w-11 inline-flex items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-muted)] disabled:opacity-30">
                  <X size={16} />
                </button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setShowDates((prev) => [...prev, ""])}>
              <Plus size={14} /> Add another date
            </Button>
          </div>
        ) : isMultiDay ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date" required>
              <div className="grid grid-cols-2 gap-2">
                <DatePicker value={form.starts_at} onChange={(v) => set("starts_at", v)} required />
                <TimePicker value={form.starts_at} onChange={(v) => set("starts_at", v)} />
              </div>
            </Field>
            <Field label="End date">
              <div className="grid grid-cols-2 gap-2">
                <DatePicker value={form.ends_at} onChange={(v) => set("ends_at", v)} />
                <TimePicker value={form.ends_at} onChange={(v) => set("ends_at", v)} />
              </div>
            </Field>
          </div>
        ) : (
          <>
            <Field label="Event date" required>
              <DatePicker value={form.starts_at} onChange={setSingleDayDate} required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start time">
                <TimePicker value={form.starts_at} onChange={(v) => set("starts_at", v)} />
              </Field>
              <Field label="End time">
                <TimePicker value={form.ends_at} onChange={(v) => set("ends_at", v)} />
              </Field>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Venue name" required>
            <input value={form.venue_name} onChange={(e) => set("venue_name", e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Area">
            <input placeholder="Downtown, Marina…" value={form.venue_area} onChange={(e) => set("venue_area", e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="Governorate" required>
          <select value={form.governorate} onChange={(e) => set("governorate", e.target.value)} className={inputCls} required>
            <option value="">— select —</option>
            <option value="beirut">Beirut</option>
            <option value="mount_lebanon">Mount Lebanon</option>
            <option value="north_lebanon">North Lebanon</option>
            <option value="south_lebanon">South Lebanon</option>
            <option value="bekaa">Bekaa</option>
            <option value="nabatieh">Nabatieh</option>
            <option value="akkar">Akkar</option>
            <option value="baalbek_hermel">Baalbek-Hermel</option>
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Price from (USD)" hint="Leave empty if free">
            <input type="number" min="0" value={form.price_min} onChange={(e) => set("price_min", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Price up to (USD)">
            <input type="number" min="0" value={form.price_max} onChange={(e) => set("price_max", e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="Ticket URL">
          <input type="url" placeholder="https://" value={form.ticket_url} onChange={(e) => set("ticket_url", e.target.value)} className={inputCls} />
        </Field>

        <Field label="Booking phone">
          <input type="tel" placeholder="+971…" value={form.booking_phone} onChange={(e) => set("booking_phone", e.target.value)} className={inputCls} />
        </Field>

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

        <Button type="submit" size="lg" variant="primary" disabled={submitting} className="w-full">
          {submitting ? "Uploading & submitting…" : "Submit event for review"}
        </Button>
      </form>
    </div>
  );
}
