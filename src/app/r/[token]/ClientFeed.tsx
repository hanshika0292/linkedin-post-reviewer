"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { Avatar, LinkedInPost, type Device } from "@/components/linkedin/LinkedInPost";
import { DeviceToggle } from "@/components/DeviceToggle";
import { ReviewPanel } from "@/components/ReviewPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { ScheduleTime } from "@/components/LocalTime";
import type { Comment, Person, Post } from "@/lib/types";

type Filter = "todo" | "approved" | "all";
const needsReview = (p: Post) => p.status === "in_review" || p.status === "changes_requested";

export function ClientFeed({ token, orgName, people, posts, comments }: {
  token: string;
  orgName: string;
  people: Person[];
  posts: Post[];
  comments: Record<string, Comment[]>;
}) {
  const [device, setDevice] = useState<Device>("desktop");
  const [personId, setPersonId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>(() => (posts.some(needsReview) ? "todo" : "all"));

  const byPerson = personId ? posts.filter((p) => p.person_id === personId) : posts;
  const shown = byPerson.filter((p) =>
    filter === "todo" ? needsReview(p) : filter === "approved" ? p.status === "approved" || p.status === "posted" : true,
  );
  const peopleById = Object.fromEntries(people.map((p) => [p.id, p]));
  const counts = {
    todo: byPerson.filter(needsReview).length,
    approved: byPerson.filter((p) => p.status === "approved" || p.status === "posted").length,
    all: byPerson.length,
  };

  return (
    <div className="min-h-screen bg-[#f4f2ee]">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">{orgName}</h1>
            <p className="text-sm text-zinc-500">Upcoming LinkedIn posts for your review. Select any text to comment on it.</p>
          </div>
          <DeviceToggle value={device} onChange={setDevice} />
        </div>
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3">
          <Chip active={!personId} onClick={() => setPersonId(null)}>Everyone</Chip>
          {people.map((p) => {
            const todo = posts.filter((x) => x.person_id === p.id && needsReview(x)).length;
            return (
              <Chip key={p.id} active={personId === p.id} onClick={() => setPersonId(p.id)}>
                <Avatar name={p.name} url={p.avatar_url} size={20} />
                {p.name}
                {todo > 0 && <span className="rounded-full bg-[#0a66c2] px-1.5 text-[10px] font-semibold text-white">{todo}</span>}
              </Chip>
            );
          })}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex gap-1 text-sm">
          {([["todo", "To review"], ["approved", "Approved"], ["all", "All"]] as const).map(([f, label]) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 ${filter === f ? "bg-white font-semibold text-zinc-900 shadow-sm" : "text-zinc-600 hover:text-zinc-900"}`}
            >
              {label} <span className="text-zinc-400">{counts[f]}</span>
            </button>
          ))}
        </div>

        {shown.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white/60 p-10 text-center text-sm text-zinc-500">
            {filter === "todo" ? "You're all caught up — nothing waiting for review." : "No posts here yet."}
          </div>
        )}

        <div className="flex flex-col gap-10">
          {shown.map((post) => {
            const person = peopleById[post.person_id];
            if (!person) return null;
            return (
              <PostReviewCard key={post.id} token={token} post={post} person={person} device={device} comments={comments[post.id] ?? []} />
            );
          })}
        </div>
      </main>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${active ? "border-[#0a66c2] bg-[#ebf4fd] font-semibold text-[#0a66c2]" : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"}`}
    >
      {children}
    </button>
  );
}

function PostReviewCard({ token, post, person, device, comments }: {
  token: string;
  post: Post;
  person: Person;
  device: Device;
  comments: Comment[];
}) {
  const [quote, setQuote] = useState<string | null>(null);
  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,555px)_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
          <StatusBadge status={post.status} />
          <span className="flex items-center gap-1"><Calendar size={12} /> <ScheduleTime iso={post.scheduled_for} /></span>
          {post.version > 1 && <span className="text-zinc-400">· Revision {post.version}</span>}
        </div>
        <div className={device === "mobile" ? "flex justify-center" : ""}>
          <LinkedInPost person={person} body={post.body} media={post.media} device={device} onQuote={setQuote} />
        </div>
      </div>
      <div className="lg:pt-7">
        <ReviewPanel
          mode="client"
          token={token}
          postId={post.id}
          status={post.status}
          currentVersion={post.version}
          comments={comments}
          quote={quote}
          onClearQuote={() => setQuote(null)}
        />
      </div>
    </section>
  );
}
