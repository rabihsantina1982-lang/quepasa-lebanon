/**
 * Standalone runner for sending due event reminders, meant to be triggered
 * by Windows Task Scheduler (or any external scheduler) without the Next.js
 * dev server needing to be running. Talks directly to Supabase + Resend.
 *
 * Usage: npx tsx scripts/run-reminders-send.ts
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { sendDueReminders } from "../src/lib/reminders";

function loadEnvLocal() {
  const path = join(__dirname, "..", ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

async function main() {
  loadEnvLocal();

  console.log(`[${new Date().toISOString()}] Checking for due reminders...`);
  try {
    const result = await sendDueReminders();
    console.log(
      `[${new Date().toISOString()}] Done. Sent: ${result.sent}, Skipped: ${result.skipped}, Errors: ${result.errors.length}`
    );
    if (result.errors.length > 0) console.error(result.errors.join("\n"));
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Reminders send failed:`, err);
    process.exit(1);
  }
}

main();
