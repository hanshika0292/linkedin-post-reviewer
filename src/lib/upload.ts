"use client";

import { createUploadUrl } from "@/app/admin/actions";
import { browserClient } from "./supabase/browser";

export async function uploadFile(file: File): Promise<string> {
  const { path, token, publicUrl } = await createUploadUrl(file.name);
  const { error } = await browserClient().storage.from("post-media").uploadToSignedUrl(path, token, file, {
    contentType: file.type,
  });
  if (error) throw new Error(error.message);
  return publicUrl;
}
