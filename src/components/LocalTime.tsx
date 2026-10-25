"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

// Formats in the viewer's own locale and timezone. The server can't know either, so it renders
// nothing and the browser fills it in after hydration (avoids mismatches and UTC times on Vercel).
export function LocalTime({ iso, options, fallback = "" }: { iso: string | null; options: Intl.DateTimeFormatOptions; fallback?: string }) {
  const text = useSyncExternalStore(
    noop,
    () => (iso ? new Date(iso).toLocaleString(undefined, options) : fallback),
    () => null,
  );
  return <time dateTime={iso ?? undefined} suppressHydrationWarning>{text ?? " "}</time>;
}

export function ScheduleTime({ iso }: { iso: string | null }) {
  return (
    <LocalTime
      iso={iso}
      fallback="Not scheduled"
      options={{ weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }}
    />
  );
}
