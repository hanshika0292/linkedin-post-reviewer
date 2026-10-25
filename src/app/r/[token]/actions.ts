"use server";

import { revalidatePath } from "next/cache";
import { orgForShareToken } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";

// Every client action re-validates that the post belongs to the org behind the share token
// and is not a hidden draft.
async function postForToken(token: string, postId: string) {
  const org = await orgForShareToken(token);
  if (!org) throw new Error("This review link is no longer valid.");
  const { data: post } = await adminDb()
    .from("posts")
    .select("id, version, status")
    .eq("id", postId)
    .eq("org_id", org.id)
    .neq("status", "draft")
    .maybeSingle();
  if (!post) throw new Error("Post not found.");
  return post;
}

export async function addClientComment(token: string, postId: string, authorName: string, body: string, quote: string | null) {
  const name = authorName.trim().slice(0, 80);
  const text = body.trim().slice(0, 5000);
  if (!name || !text) throw new Error("Name and comment are required.");
  const post = await postForToken(token, postId);
  await adminDb().from("comments").insert({
    post_id: post.id,
    author_name: name,
    author_type: "client",
    body: text,
    quote: quote?.slice(0, 1000) ?? null,
    post_version: post.version,
  });
  revalidatePath(`/r/${token}`);
}

export async function setClientDecision(token: string, postId: string, authorName: string, decision: "approved" | "changes_requested", note: string) {
  const name = authorName.trim().slice(0, 80);
  if (!name) throw new Error("Please add your name first.");
  const post = await postForToken(token, postId);
  if (post.status === "posted") throw new Error("This post is already live.");
  const db = adminDb();
  await db.from("posts").update({ status: decision }).eq("id", post.id);
  await db.from("comments").insert({
    post_id: post.id,
    author_name: name,
    author_type: "client",
    body: decision === "approved" ? `✅ Approved${note.trim() ? ` — ${note.trim()}` : ""}` : `✏️ Requested changes${note.trim() ? ` — ${note.trim()}` : ""}`,
    post_version: post.version,
  });
  revalidatePath(`/r/${token}`);
}
