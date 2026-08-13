import { cn } from "@/lib/utils";
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("qp-skeleton rounded-[var(--radius-card)]", className)} />;
}
