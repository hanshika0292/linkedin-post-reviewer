"use client";

import { useState } from "react";
import { Avatar } from "@/components/linkedin/LinkedInPost";
import { uploadFile } from "@/lib/upload";
import type { Person } from "@/lib/types";

export function PersonForm({ action, person, submitLabel }: {
  action: (fd: FormData) => Promise<void>;
  person?: Person;
  submitLabel: string;
}) {
  const [avatar, setAvatar] = useState(person?.avatar_url ?? "");
  const [name, setName] = useState(person?.name ?? "");
  const [uploading, setUploading] = useState(false);

  return (
    <form
      action={async (fd) => {
        await action(fd);
        if (!person) {
          setAvatar("");
          setName("");
        }
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center gap-3">
        <label className="cursor-pointer" title="Upload photo">
          <Avatar name={name} url={avatar || null} size={48} />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setUploading(true);
              try {
                setAvatar(await uploadFile(f));
              } finally {
                setUploading(false);
              }
            }}
          />
        </label>
        <div className="text-xs text-zinc-500">{uploading ? "Uploading…" : "Click the circle to upload a profile photo"}</div>
      </div>
      <input type="hidden" name="avatar_url" value={avatar} />
      <input name="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-[#0a66c2]" />
      <input name="headline" defaultValue={person?.headline} placeholder="LinkedIn headline (e.g. CEO at Acme | Building …)" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-[#0a66c2]" />
      <input name="linkedin_url" defaultValue={person?.linkedin_url ?? ""} placeholder="linkedin.com/in/… (optional)" className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-[#0a66c2]" />
      <button disabled={uploading} className="self-start rounded-full bg-[#0a66c2] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#004182] disabled:opacity-50">{submitLabel}</button>
    </form>
  );
}
