import Link from "next/link";
import { adminDb } from "@/lib/supabase/admin";
import { createOrg } from "./actions";

export default async function AdminHome() {
  const db = adminDb();
  const [{ data: orgs }, { data: people }, { data: posts }] = await Promise.all([
    db.from("orgs").select("id, name, created_at").order("name"),
    db.from("people").select("org_id"),
    db.from("posts").select("org_id, status"),
  ]);
  const count = <T extends { org_id: string }>(rows: T[] | null, orgId: string, pred: (r: T) => boolean = () => true) =>
    (rows ?? []).filter((r) => r.org_id === orgId && pred(r)).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-xl font-semibold">Clients</h1>
        <form action={createOrg} className="flex gap-2">
          <input name="name" required placeholder="New client / org name" className="w-64 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#0a66c2]" />
          <button className="rounded-full bg-[#0a66c2] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#004182]">Add</button>
        </form>
      </div>
      {!orgs?.length ? (
        <p className="rounded-lg border border-dashed border-zinc-300 bg-white/60 p-10 text-center text-sm text-zinc-500">No clients yet. Add your first one above.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((o) => {
            const waiting = count(posts, o.id, (p) => p.status === "in_review");
            const changes = count(posts, o.id, (p) => p.status === "changes_requested");
            return (
              <Link key={o.id} href={`/admin/orgs/${o.id}`} className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-400">
                <div className="font-semibold">{o.name}</div>
                <div className="mt-1 text-sm text-zinc-500">
                  {count(people, o.id)} people · {count(posts, o.id)} posts
                </div>
                <div className="mt-2 flex gap-2 text-xs">
                  {waiting > 0 && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">{waiting} awaiting client</span>}
                  {changes > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">{changes} need edits</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
