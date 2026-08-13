"use client";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Row {
  id: string;
  slug: string;
  title_i18n: Record<string, string>;
  starts_at: string;
  status: string;
  source: string;
  created_at: string;
}

export function AdminQueue({ items }: { items: Row[] }) {
  const router = useRouter();
  async function setStatus(id: string, status: "published" | "rejected") {
    const supabase = createClient();
    await supabase.from("events").update({ status }).eq("id", id);
    router.refresh();
  }
  if (items.length === 0) return <p className="text-[var(--color-muted)]">Nothing pending. 🎉</p>;
  return (
    <table className="w-full text-sm">
      <thead className="text-[var(--color-muted)] text-start">
        <tr><th className="text-start py-2">Title</th><th className="text-start">Source</th><th className="text-start">Starts</th><th></th></tr>
      </thead>
      <tbody>
        {items.map((r) => (
          <tr key={r.id} className="border-t border-[var(--color-border)]">
            <td className="py-3">{r.title_i18n.en ?? r.slug}</td>
            <td>{r.source}</td>
            <td>{new Date(r.starts_at).toLocaleString()}</td>
            <td className="flex gap-2 justify-end py-2">
              <Button size="sm" variant="primary" onClick={() => setStatus(r.id, "published")}>Approve</Button>
              <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "rejected")}>Reject</Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
