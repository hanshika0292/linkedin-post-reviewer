export type PostStatus = "draft" | "in_review" | "changes_requested" | "approved" | "posted";

export const STATUS_LABELS: Record<PostStatus, string> = {
  draft: "Draft",
  in_review: "Ready for review",
  changes_requested: "Changes requested",
  approved: "Approved",
  posted: "Posted",
};

export const STATUS_STYLES: Record<PostStatus, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  in_review: "bg-blue-50 text-blue-700",
  changes_requested: "bg-amber-50 text-amber-800",
  approved: "bg-emerald-50 text-emerald-700",
  posted: "bg-violet-50 text-violet-700",
};

// Mirrors the kinds of attachments a real LinkedIn post can carry (one kind per post).
export type PostMedia =
  | { kind: "none" }
  | { kind: "images"; images: { url: string; alt?: string }[] }
  | { kind: "video"; url: string; poster?: string }
  | { kind: "document"; title: string; pages: string[] }
  | { kind: "link"; url: string; title: string; domain: string; image?: string }
  | { kind: "poll"; question: string; options: string[]; duration: "1d" | "3d" | "1w" | "2w" };

export type Org = { id: string; name: string; share_token: string; created_at: string };

export type Person = {
  id: string;
  org_id: string;
  name: string;
  headline: string;
  avatar_url: string | null;
  linkedin_url: string | null;
};

export type Post = {
  id: string;
  org_id: string;
  person_id: string;
  body: string;
  media: PostMedia;
  status: PostStatus;
  scheduled_for: string | null;
  version: number;
  created_at: string;
  updated_at: string;
};

export type Comment = {
  id: string;
  post_id: string;
  author_name: string;
  author_type: "client" | "team";
  body: string;
  quote: string | null;
  post_version: number;
  resolved: boolean;
  created_at: string;
};

export const MAX_POST_CHARS = 3000;
