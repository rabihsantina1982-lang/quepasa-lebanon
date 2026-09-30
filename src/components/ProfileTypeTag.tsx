import { cn } from "@/lib/utils";
import { PROFILE_TYPE_STYLE, type ProfileType } from "@/lib/profileTypes";

export function ProfileTypeTag({ type, label, className }: { type: ProfileType; label: string; className?: string }) {
  return (
    <span className={cn("inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium", PROFILE_TYPE_STYLE[type], className)}>
      {label}
    </span>
  );
}
