"use client";

import { Monitor, Smartphone } from "lucide-react";
import type { Device } from "./linkedin/LinkedInPost";

export function DeviceToggle({ value, onChange }: { value: Device; onChange: (d: Device) => void }) {
  return (
    <div className="inline-flex rounded-full border border-zinc-200 bg-white p-0.5 text-xs">
      {([["desktop", Monitor, "Desktop"], ["mobile", Smartphone, "Mobile"]] as const).map(([d, Icon, label]) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${value === d ? "bg-zinc-900 text-white" : "text-zinc-600 hover:text-zinc-900"}`}
        >
          <Icon size={13} /> {label}
        </button>
      ))}
    </div>
  );
}
