import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { orgForShareToken } from "@/lib/auth";
import { getCommentsByPost, getPeople, getPosts } from "@/lib/data";
import { ClientFeed } from "./ClientFeed";

export const metadata: Metadata = { title: "Review posts", robots: { index: false, follow: false } };

export default async function ClientReviewPage({ params }: PageProps<"/r/[token]">) {
  const { token } = await params;
  const org = await orgForShareToken(token);
  if (!org) notFound();
  const [people, posts] = await Promise.all([getPeople(org.id), getPosts(org.id, { includeDrafts: false })]);
  const comments = await getCommentsByPost(posts.map((p) => p.id));
  return <ClientFeed token={token} orgName={org.name} people={people} posts={posts} comments={comments} />;
}
