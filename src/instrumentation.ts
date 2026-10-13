// Server errors on any page or API route email the admins (throttled, see
// src/lib/alerts.ts). Next.js calls onRequestError for errors it catches.
import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const error = err as Error & { digest?: string };
  // Same route + same first line of the message = the same problem.
  const firstLine = (error.message ?? "").split("\n")[0].slice(0, 120);
  const { alertAdmins } = await import("./lib/alerts");
  await alertAdmins(
    `request:${context.routePath}:${firstLine}`,
    `Error on ${context.routePath}`,
    [
      `Page: ${request.method} ${request.path}`,
      `Where: ${context.routeType} (${context.routerKind})`,
      error.digest ? `Error ID: ${error.digest}` : "",
      "",
      error.message ?? String(err),
      error.stack ?? "",
    ].filter((l) => l !== undefined).join("\n")
  );
};
