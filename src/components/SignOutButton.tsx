"use client";
import { createClient } from "@/lib/supabase/client";
import { Button } from "./ui/button";
import { useRouter } from "@/i18n/navigation";

export function SignOutButton({ label }: { label: string }) {
  const router = useRouter();
  async function onClick() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }
  return <Button size="sm" variant="outline" onClick={onClick}>{label}</Button>;
}
