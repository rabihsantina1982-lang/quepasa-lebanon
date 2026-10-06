import { BadgeCheck } from "lucide-react";

// How an applicant proves they own the Instagram account they applied with:
// put the code in their bio so we can see it from the outside.
export function VerificationSteps({ code, instagram }: { code: string; instagram?: string | null }) {
  return (
    <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 p-4 text-start space-y-2">
      <div className="flex items-center gap-2 font-semibold">
        <BadgeCheck size={16} className="text-[var(--color-primary)]" aria-hidden /> Verify your account
      </div>
      <p className="text-sm">
        Add this code to the bio of your Instagram account{instagram ? <> <strong>@{instagram}</strong></> : null}:
      </p>
      <div className="text-2xl font-bold tracking-widest text-center py-1 select-all">{code}</div>
      <p className="text-xs text-[var(--color-muted)]">
        It shows us the application really comes from you, not someone using your name. Keep it there until you&apos;re
        approved and verified, then you can remove it. Verified businesses get a ✓ badge on their events and profile.
      </p>
    </div>
  );
}
