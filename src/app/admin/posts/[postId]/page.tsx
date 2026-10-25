import { notFound } from "next/navigation";
import { adminDb } from "@/lib/supabase/admin";
import { getCommentsByPost, getOrg } from "@/lib/data";
import type { Person, Post } from "@/lib/types";
import { PostEditor } from "./PostEditor";

export default async function PostPage({ params }: PageProps<"/admin/posts/[postId]">) {
  const { postId } = await params;
  const db = adminDb();
  const { data: post } = await db.from("posts").select("*").eq("id", postId).maybeSingle<Post>();
  if (!post) notFound();
  const [{ data: person }, org, comments] = await Promise.all([
    db.from("people").select("*").eq("id", post.person_id).single<Person>(),
    getOrg(post.org_id),
    getCommentsByPost([post.id]),
  ]);
  if (!person || !org) notFound();
  return <PostEditor post={post} person={person} org={org} comments={comments[post.id] ?? []} />;
}
