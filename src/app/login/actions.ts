"use server";

import { redirect } from "next/navigation";
import { authClient } from "@/lib/supabase/server";

export async function signIn(fd: FormData) {
  const email = String(fd.get("email") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  const next = String(fd.get("next") ?? "/admin");
  const supabase = await authClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`);
  redirect(next.startsWith("/admin") ? next : "/admin");
}
