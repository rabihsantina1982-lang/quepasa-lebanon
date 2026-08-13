"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { CategoryRow } from "@/lib/supabase/types";

const schema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category_id: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().positive()),
  starts_at: z.string().min(1),
  ends_at: z.string().optional().or(z.literal("")),
  venue_name: z.string().min(2),
  venue_area: z.string().optional(),
  ticket_url: z.string().url().optional().or(z.literal("")),
  booking_phone: z.string().optional(),
  cover_image: z.string().url().optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyForm = any;

export function SubmitForm({ categories, locale }: { categories: CategoryRow[]; locale: string }) {
  const t = useTranslations("Submit");
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema) as AnyForm,
  });

  async function onSubmit(values: FormData) {
    const supabase = createClient();
    // 1. Upsert venue.
    const { data: venue, error: venueErr } = await supabase
      .from("venues")
      .insert({ name: values.venue_name, area: values.venue_area || null, city: "Beirut" })
      .select()
      .single();
    if (venueErr) return alert(venueErr.message);

    // 2. Insert submission (status=pending).
    const { error } = await supabase.from("events").insert({
      slug: values.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60) + "-" + Date.now().toString(36),
      title_i18n: { [locale]: values.title, en: values.title },
      description_i18n: { [locale]: values.description, en: values.description },
      category_id: values.category_id,
      venue_id: (venue as { id: string }).id,
      starts_at: new Date(values.starts_at).toISOString(),
      ends_at: values.ends_at ? new Date(values.ends_at).toISOString() : null,
      cover_image: values.cover_image || null,
      ticket_url: values.ticket_url || null,
      booking_phone: values.booking_phone || null,
      status: "pending",
      source: "user",
    });
    if (error) return alert(error.message);
    setSubmitted(true);
  }

  if (submitted) {
    return <div className="mt-8 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-4">{t("submitted")}</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
      <Field label="Title"><input {...register("title")} className={inputCls} />{errors.title && <Err msg={errors.title.message} />}</Field>
      <Field label="Description"><textarea {...register("description")} rows={5} className={inputCls} />{errors.description && <Err msg={errors.description.message} />}</Field>
      <Field label="Category">
        <select {...register("category_id")} className={inputCls}>
          <option value="">—</option>
          {categories.map((c) => (<option key={c.id} value={c.id}>{c.slug}</option>))}
        </select>
        {errors.category_id && <Err msg={errors.category_id.message} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts at"><input type="datetime-local" {...register("starts_at")} className={inputCls} /></Field>
        <Field label="Ends at"><input type="datetime-local" {...register("ends_at")} className={inputCls} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Venue name"><input {...register("venue_name")} className={inputCls} /></Field>
        <Field label="Area"><input {...register("venue_area")} placeholder="Downtown, Marina…" className={inputCls} /></Field>
      </div>
      <Field label="Ticket URL"><input {...register("ticket_url")} placeholder="https://" className={inputCls} /></Field>
      <Field label="Booking phone"><input {...register("booking_phone")} placeholder="+971…" className={inputCls} /></Field>
      <Field label="Cover image URL"><input {...register("cover_image")} placeholder="https://" className={inputCls} /></Field>
      <Button type="submit" size="lg" disabled={isSubmitting}>Submit</Button>
    </form>
  );
}

const inputCls = "w-full h-11 px-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-sm";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-sm text-[var(--color-muted)]">{label}</span>{children}</label>;
}
function Err({ msg }: { msg?: string }) {
  return <span className="text-xs text-[var(--color-danger)]">{msg}</span>;
}
