"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

export function ShareLink({ token }: { token: string }) {
  const origin = useSyncExternalStore(() => () => {}, () => window.location.origin, () => "");
  const [copied, setCopied] = useState(false);
  const url = `${origin}/r/${token}`;
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700">{url}</code>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="flex items-center gap-1 rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-50"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
      </button>
      <a href={`/r/${token}`} target="_blank" className="flex items-center gap-1 rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-50">
        <ExternalLink size={13} /> Open
      </a>
    </div>
  );
}
