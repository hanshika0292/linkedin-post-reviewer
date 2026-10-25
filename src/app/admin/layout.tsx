import Link from "next/link";
import { requireTeamUser } from "@/lib/auth";
import { signOut } from "./actions";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireTeamUser();
  return (
    <div className="min-h-screen bg-[#f4f2ee]">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="font-semibold text-zinc-900">Post Reviewer</Link>
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            {user.email}
            <form action={signOut}>
              <button className="text-zinc-700 hover:text-zinc-900">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
