import { signIn } from "./actions";

const ERRORS: Record<string, string> = {
  invalid: "Wrong email or password.",
  not_team: "This account isn't on the team. Ask an admin to add you.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, next } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f2ee] px-4">
      <form action={signIn} className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Post Reviewer</h1>
        <p className="mb-5 text-sm text-zinc-500">Team sign in</p>
        {typeof error === "string" && ERRORS[error] && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{ERRORS[error]}</p>
        )}
        <input type="hidden" name="next" value={typeof next === "string" ? next : "/admin"} />
        <label className="mb-3 block text-sm">
          <span className="text-zinc-700">Email</span>
          <input name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#0a66c2]" />
        </label>
        <label className="mb-5 block text-sm">
          <span className="text-zinc-700">Password</span>
          <input name="password" type="password" required autoComplete="current-password" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 outline-none focus:border-[#0a66c2]" />
        </label>
        <button className="w-full rounded-full bg-[#0a66c2] py-2 text-sm font-semibold text-white hover:bg-[#004182]">Sign in</button>
      </form>
    </main>
  );
}
