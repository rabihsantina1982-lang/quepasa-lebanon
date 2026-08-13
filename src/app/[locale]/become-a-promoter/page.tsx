"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

const inputCls = "w-full h-11 px-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-sm outline-none focus:border-[var(--color-primary)] transition-colors";
const textareaCls = "w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] text-sm outline-none focus:border-[var(--color-primary)] transition-colors resize-none";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">
        {label} {required && <span className="text-[var(--color-danger)]">*</span>}
      </span>
      {children}
    </label>
  );
}

export default function BecomeAPromoterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    business_name: "",
    business_type: "",
    phone: "",
    instagram: "",
    website: "",
    description: "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Check signed in
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You need to sign in first before applying.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/promoter/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold">Application submitted!</h1>
        <p className="mt-3 text-[var(--color-muted)]">
          We&apos;ll review your application and get back to you shortly. Once approved, you&apos;ll get a 3-month free trial to start posting your events.
        </p>
        <Button className="mt-6" onClick={() => router.push("/events")}>Browse events</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Become a Promoter</h1>
        <p className="mt-2 text-[var(--color-muted)]">
          List your events on QuePasa and reach thousands of people across Lebanon.
          Apply below — approved promoters get a <strong>3-month free trial</strong>.
        </p>

        {/* Pricing cards */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] p-4">
            <div className="text-sm font-semibold text-[var(--color-muted)]">STANDARD</div>
            <div className="mt-1 text-2xl font-bold">$40<span className="text-sm font-normal text-[var(--color-muted)]">/mo</span></div>
            <div className="mt-2 text-sm text-[var(--color-muted)]">Up to 5 events per month</div>
          </div>
          <div className="rounded-[var(--radius-card)] border-2 border-[var(--color-primary)] p-4">
            <div className="text-sm font-semibold text-[var(--color-primary)]">PRO</div>
            <div className="mt-1 text-2xl font-bold">$80<span className="text-sm font-normal text-[var(--color-muted)]">/mo</span></div>
            <div className="mt-2 text-sm text-[var(--color-muted)]">Unlimited events per month</div>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-[var(--color-muted)]">
          ✨ First 3 months completely free — no credit card required
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Your full name" required>
            <input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Business / Artist name" required>
            <input value={form.business_name} onChange={(e) => set("business_name", e.target.value)} className={inputCls} required />
          </Field>
        </div>

        <Field label="I am a…" required>
          <select value={form.business_type} onChange={(e) => set("business_type", e.target.value)} className={inputCls} required>
            <option value="">— select one —</option>
            <option value="promoter">Event Promoter</option>
            <option value="venue">Venue</option>
            <option value="artist">Artist / Performer</option>
            <option value="agency">Talent Agency</option>
            <option value="brand">Brand / Sponsor</option>
            <option value="other">Other</option>
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone number" required>
            <input type="tel" placeholder="+971…" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Instagram handle">
            <input placeholder="@yourhandle" value={form.instagram} onChange={(e) => set("instagram", e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="Website">
          <input type="url" placeholder="https://" value={form.website} onChange={(e) => set("website", e.target.value)} className={inputCls} />
        </Field>

        <Field label="Tell us about yourself and the events you organise" required>
          <textarea
            rows={5}
            placeholder="What kind of events do you run? Where? How often?"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className={textareaCls}
            required
          />
        </Field>

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

        <Button type="submit" size="lg" variant="primary" disabled={loading} className="w-full">
          {loading ? "Submitting…" : "Submit application"}
        </Button>

        <p className="text-center text-xs text-[var(--color-muted)]">
          By applying you agree to our terms of service. We&apos;ll review and respond within 2 business days.
        </p>
      </form>
    </div>
  );
}
