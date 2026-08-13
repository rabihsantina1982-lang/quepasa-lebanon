import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewEventForm } from "./NewEventForm";

export default async function NewEventPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}?signin=1&next=/${locale}/promoter/new-event`);

  const { data: profileRaw } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const profile = profileRaw as { role: string } | null;
  if (profile?.role !== "promoter" && profile?.role !== "admin") {
    redirect(`/${locale}/promoter`);
  }

  return <NewEventForm />;
}
