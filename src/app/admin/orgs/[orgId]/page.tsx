import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageSquare, Plus } from "lucide-react";
import { getCommentsByPost, getOrg, getPeople, getPosts } from "@/lib/data";
import { Avatar } from "@/components/linkedin/LinkedInPost";
import { PersonForm } from "@/components/admin/PersonForm";
import { ShareLink } from "@/components/admin/ShareLink";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { StatusBadge } from "@/components/StatusBadge";
import { ScheduleTime } from "@/components/LocalTime";
import { createPerson, createPost, deleteOrg, deletePerson, renameOrg, rotateShareToken, updatePerson } from "../../actions";

export default async function OrgPage({ params }: PageProps<"/admin/orgs/[orgId]">) {
  const { orgId } = await params;
  const org = await getOrg(orgId);
  if (!org) notFound();
  const [people, posts] = await Promise.all([getPeople(orgId), getPosts(orgId, { includeDrafts: true })]);
  const comments = await getCommentsByPost(posts.map((p) => p.id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-900">← Clients</Link>
        <form action={renameOrg.bind(null, orgId)} className="mt-1 flex items-center gap-2">
          <input
            name="name"
            defaultValue={org.name}
            className="rounded-md border border-transparent bg-transparent px-1 text-xl font-semibold outline-none hover:border-zinc-300 focus:border-[#0a66c2] focus:bg-white"
          />
          <button className="text-xs text-zinc-500 hover:text-zinc-900">Save name</button>
        </form>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Client review link</h2>
          <ConfirmButton
            action={rotateShareToken.bind(null, orgId)}
            label="Reset link"
            confirmLabel="Old link will stop working — confirm"
            className="text-xs text-zinc-500 hover:text-zinc-900"
          />
        </div>
        <p className="mb-3 text-sm text-zinc-500">
          Anyone with this link can view non-draft posts for {org.name} and leave feedback. No login needed.
        </p>
        <ShareLink token={org.share_token} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">People</h2>
          {people.map((p) => (
            <details key={p.id} className="group rounded-lg border border-zinc-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
                <Avatar name={p.name} url={p.avatar_url} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="truncate text-xs text-zinc-500">{p.headline}</div>
                </div>
                <span className="text-xs text-zinc-400 group-open:hidden">Edit</span>
              </summary>
              <div className="border-t border-zinc-100 p-3">
                <PersonForm action={updatePerson.bind(null, p.id)} person={p} submitLabel="Save" />
                <ConfirmButton
                  action={deletePerson.bind(null, p.id)}
                  label="Delete person and their posts"
                  className="mt-3 text-xs text-zinc-500 hover:text-red-600"
                />
              </div>
            </details>
          ))}
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white/60 p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Add person</h3>
            <PersonForm action={createPerson.bind(null, orgId)} submitLabel="Add person" />
          </div>
        </aside>

        <section className="flex flex-col gap-5">
          {people.length === 0 && (
            <p className="rounded-lg border border-dashed border-zinc-300 bg-white/60 p-10 text-center text-sm text-zinc-500">
              Add the people whose LinkedIn accounts you post for, then create posts for them.
            </p>
          )}
          {people.map((person) => {
            const theirs = posts.filter((p) => p.person_id === person.id);
            return (
              <div key={person.id} className="rounded-lg border border-zinc-200 bg-white">
                <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={person.name} url={person.avatar_url} size={28} />
                    <span className="text-sm font-semibold">{person.name}</span>
                    <span className="text-xs text-zinc-400">{theirs.length} posts</span>
                  </div>
                  <form action={createPost.bind(null, person.id)}>
                    <button className="flex items-center gap-1 rounded-full bg-[#0a66c2] px-3 py-1 text-xs font-semibold text-white hover:bg-[#004182]">
                      <Plus size={13} /> New post
                    </button>
                  </form>
                </div>
                {theirs.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-zinc-400">No posts yet.</p>
                ) : (
                  <ul className="divide-y divide-zinc-100">
                    {theirs.map((post) => {
                      const open = (comments[post.id] ?? []).filter((c) => !c.resolved && c.author_type === "client").length;
                      return (
                        <li key={post.id}>
                          <Link href={`/admin/posts/${post.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50">
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm text-zinc-900">{post.body.split("\n")[0] || <span className="italic text-zinc-400">Empty draft</span>}</div>
                              <div className="mt-0.5 text-xs text-zinc-500"><ScheduleTime iso={post.scheduled_for} /></div>
                            </div>
                            {open > 0 && (
                              <span className="flex items-center gap-1 text-xs font-semibold text-amber-700">
                                <MessageSquare size={13} /> {open}
                              </span>
                            )}
                            <StatusBadge status={post.status} />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      </div>

      <div className="border-t border-zinc-200 pt-4">
        <ConfirmButton
          action={deleteOrg.bind(null, orgId)}
          label={`Delete ${org.name}`}
          confirmLabel="Deletes all people, posts and comments — click to confirm"
          className="text-xs text-zinc-500 hover:text-red-600"
        />
      </div>
    </div>
  );
}
