export const REPORT_REASONS = ["scam", "wrong_info", "cancelled", "impersonation", "offensive", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

// Open reports adding up to this weight take a published event off the site
// until an admin looks at it. A report from an established account counts 1;
// one from an account younger than NEW_ACCOUNT_DAYS counts NEW_ACCOUNT_WEIGHT,
// so a few freshly made accounts can't hide a rival's event on their own.
export const AUTO_HIDE_REPORTS = 3;
export const NEW_ACCOUNT_DAYS = 7;
export const NEW_ACCOUNT_WEIGHT = 0.5;

export function isNewAccount(createdAt: string | null | undefined, now = new Date()): boolean {
  return !createdAt || now.getTime() - new Date(createdAt).getTime() < NEW_ACCOUNT_DAYS * 86400000;
}

export function reportWeight(reporterCreatedAt: string | null | undefined, now = new Date()): number {
  return isNewAccount(reporterCreatedAt, now) ? NEW_ACCOUNT_WEIGHT : 1;
}

// Admin screens are English-only.
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  scam: "Fake tickets / scam",
  wrong_info: "Wrong date, place or price",
  cancelled: "Cancelled or postponed",
  impersonation: "Pretending to be someone else",
  offensive: "Offensive or inappropriate",
  other: "Something else",
};
