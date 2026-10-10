import { QUALITY_COLOR, QUALITY_LABEL, type QualityResult } from "@/lib/eventQuality";

// Score pill + what to improve. `collapsed` folds the tips behind the pill.
export function EventQuality({ result, collapsed = false }: { result: QualityResult; collapsed?: boolean }) {
  const pill = (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${QUALITY_COLOR[result.level]}`}>
      Listing quality {result.score}/100 · {QUALITY_LABEL[result.level]}
    </span>
  );
  if (result.tips.length === 0) return pill;

  const tips = (
    <ul className="mt-2 list-disc ps-5 space-y-1 text-xs text-[var(--color-muted)]">
      {result.tips.map((tip) => <li key={tip}>{tip}</li>)}
    </ul>
  );
  if (!collapsed) {
    return (
      <div>
        {pill}
        {tips}
      </div>
    );
  }
  return (
    <details className="text-xs">
      <summary className="cursor-pointer list-none inline-flex items-center gap-1">
        {pill} <span className="text-[var(--color-primary)] hover:underline">How to improve</span>
      </summary>
      {tips}
      <p className="mt-1 text-[var(--color-muted)]">Use these on your next event, or Duplicate this one to post an improved copy.</p>
    </details>
  );
}
