export const REPORT_REASONS = ["scam", "wrong_info", "cancelled", "impersonation", "offensive", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

// Open reports from this many different people take a published event off
// the site until an admin looks at it.
export const AUTO_HIDE_REPORTS = 3;

// Admin screens are English-only.
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  scam: "Fake tickets / scam",
  wrong_info: "Wrong date, place or price",
  cancelled: "Cancelled or postponed",
  impersonation: "Pretending to be someone else",
  offensive: "Offensive or inappropriate",
  other: "Something else",
};
