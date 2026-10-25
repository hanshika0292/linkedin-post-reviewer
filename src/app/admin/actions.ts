"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeamUser } from "@/lib/auth";
import { adminDb } from "@/lib/supabase/admin";
import { authClient } from "@/lib/supabase/server";
import { MEDIA_BUCKET } from "@/lib/data";
import { MAX_POST_CHARS, type PostMedia, type PostStatus } from "@/lib/types";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

// ---------- Orgs ----------

export async function createOrg(fd: FormData) {
  await requireTeamUser();
  const name = str(fd, "name");
  if (!name) return;
  const { data, error } = await adminDb().from("orgs").insert({ name }).select("id").single();
  if (error) throw new Error(error.message);
  redirect(`/admin/orgs/${data.id}`);
}

export async function renameOrg(orgId: string, fd: FormData) {
  await requireTeamUser();
  const name = str(fd, "name");
  if (!name) return;
  await adminDb().from("orgs").update({ name }).eq("id", orgId);
  revalidatePath(`/admin/orgs/${orgId}`);
}

export async function rotateShareToken(orgId: string) {
  await requireTeamUser();
  const token = Buffer.from(crypto.getRandomValues(new Uint8Array(18))).toString("hex");
  await adminDb().from("orgs").update({ share_token: token }).eq("id", orgId);
  revalidatePath(`/admin/orgs/${orgId}`);
}

export async function deleteOrg(orgId: string) {
  await requireTeamUser();
  await adminDb().from("orgs").delete().eq("id", orgId);
  redirect("/admin");
}

// ---------- People ----------

function personFields(fd: FormData) {
  return {
    name: str(fd, "name"),
    headline: str(fd, "headline"),
    avatar_url: str(fd, "avatar_url") || null,
    linkedin_url: str(fd, "linkedin_url") || null,
  };
}

export async function createPerson(orgId: string, fd: FormData) {
  await requireTeamUser();
  const fields = personFields(fd);
  if (!fields.name) return;
  await adminDb().from("people").insert({ org_id: orgId, ...fields });
  revalidatePath(`/admin/orgs/${orgId}`);
}

export async function updatePerson(personId: string, fd: FormData) {
  await requireTeamUser();
  const fields = personFields(fd);
  if (!fields.name) return;
  const { data } = await adminDb().from("people").update(fields).eq("id", personId).select("org_id").single();
  if (data) revalidatePath(`/admin/orgs/${data.org_id}`);
}

export async function deletePerson(personId: string) {
  await requireTeamUser();
  const { data } = await adminDb().from("people").delete().eq("id", personId).select("org_id").single();
  if (data) revalidatePath(`/admin/orgs/${data.org_id}`);
}

// ---------- Posts ----------

export async function createPost(personId: string) {
  await requireTeamUser();
  const db = adminDb();
  const { data: person } = await db.from("people").select("org_id").eq("id", personId).single();
  if (!person) throw new Error("Person not found");
  const { data, error } = await db.from("posts").insert({ person_id: personId, org_id: person.org_id }).select("id").single();
  if (error) throw new Error(error.message);
  redirect(`/admin/posts/${data.id}`);
}

export type PostInput = {
  body: string;
  media: PostMedia;
  status: PostStatus;
  scheduled_for: string | null;
};

// Content edits bump `version` so reviewers can tell which comments predate a change.
export async function savePost(postId: string, input: PostInput) {
  await requireTeamUser();
  if (input.body.length > MAX_POST_CHARS) throw new Error(`Post exceeds ${MAX_POST_CHARS} characters`);
  const db = adminDb();
  const { data: current } = await db.from("posts").select("body, media, version, org_id").eq("id", postId).single();
  if (!current) throw new Error("Post not found");
  const contentChanged =
    current.body !== input.body || JSON.stringify(current.media) !== JSON.stringify(input.media);
  const { error } = await db
    .from("posts")
    .update({
      body: input.body,
      media: input.media,
      status: input.status,
      scheduled_for: input.scheduled_for,
      version: contentChanged ? current.version + 1 : current.version,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/posts/${postId}`);
  revalidatePath(`/admin/orgs/${current.org_id}`);
}

export async function deletePost(postId: string) {
  await requireTeamUser();
  const { data } = await adminDb().from("posts").delete().eq("id", postId).select("org_id").single();
  redirect(data ? `/admin/orgs/${data.org_id}` : "/admin");
}

// ---------- Comments ----------

export async function addTeamComment(postId: string, body: string, quote: string | null) {
  const user = await requireTeamUser();
  if (!body.trim()) return;
  const db = adminDb();
  const { data: post } = await db.from("posts").select("version").eq("id", postId).single();
  if (!post) throw new Error("Post not found");
  await db.from("comments").insert({
    post_id: postId,
    author_name: user.email.split("@")[0],
    author_type: "team",
    body: body.trim(),
    quote,
    post_version: post.version,
  });
  revalidatePath(`/admin/posts/${postId}`);
}

export async function setCommentResolved(commentId: string, resolved: boolean) {
  await requireTeamUser();
  const { data } = await adminDb().from("comments").update({ resolved }).eq("id", commentId).select("post_id").single();
  if (data) revalidatePath(`/admin/posts/${data.post_id}`);
}

// ---------- Media ----------

// Browser uploads go straight to Storage via a one-time signed URL (no 4.5 MB function body limit).
export async function createUploadUrl(fileName: string) {
  await requireTeamUser();
  const ext = fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "bin";
  const path = `${crypto.randomUUID()}.${ext}`;
  const storage = adminDb().storage.from(MEDIA_BUCKET);
  const { data, error } = await storage.createSignedUploadUrl(path);
  if (error) throw new Error(error.message);
  return { path: data.path, token: data.token, publicUrl: storage.getPublicUrl(data.path).data.publicUrl };
}

// Pulls Open Graph tags so link attachments look like LinkedIn's link cards.
export async function fetchLinkPreview(url: string) {
  await requireTeamUser();
  const parsed = new URL(url);
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("Only http(s) links are supported");
  const domain = parsed.hostname.replace(/^www\./, "");
  try {
    const res = await fetch(parsed, { headers: { "user-agent": "Mozilla/5.0 (compatible; PostReviewer/1.0)" }, signal: AbortSignal.timeout(6000) });
    const html = (await res.text()).slice(0, 300_000);
    const meta = (prop: string) =>
      html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, "i"))?.[1] ??
      html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, "i"))?.[1];
    const title = meta("og:title") ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? url;
    const image = meta("og:image");
    return { title: decodeEntities(title.trim()), domain, image: image ? new URL(image, parsed).toString() : undefined };
  } catch {
    return { title: url, domain, image: undefined };
  }
}

function decodeEntities(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

// ---------- Session ----------

export async function signOut() {
  const supabase = await authClient();
  await supabase.auth.signOut();
  redirect("/login");
}
