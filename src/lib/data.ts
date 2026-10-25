import "server-only";
import { adminDb } from "./supabase/admin";
import type { Comment, Org, Person, Post } from "./types";

export const MEDIA_BUCKET = "post-media";

export async function getOrg(orgId: string) {
  const { data } = await adminDb().from("orgs").select("*").eq("id", orgId).maybeSingle();
  return data as Org | null;
}

export async function getPeople(orgId: string) {
  const { data } = await adminDb().from("people").select("*").eq("org_id", orgId).order("created_at");
  return (data ?? []) as Person[];
}

export async function getPosts(orgId: string, opts: { includeDrafts: boolean }) {
  let q = adminDb().from("posts").select("*").eq("org_id", orgId);
  if (!opts.includeDrafts) q = q.neq("status", "draft");
  const { data } = await q.order("scheduled_for", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
  return (data ?? []) as Post[];
}

export async function getCommentsByPost(postIds: string[]) {
  const byPost: Record<string, Comment[]> = {};
  if (!postIds.length) return byPost;
  const { data } = await adminDb().from("comments").select("*").in("post_id", postIds).order("created_at");
  for (const c of (data ?? []) as Comment[]) (byPost[c.post_id] ??= []).push(c);
  return byPost;
}
