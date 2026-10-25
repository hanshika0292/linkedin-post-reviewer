import "server-only";
import { redirect } from "next/navigation";
import { authClient } from "./supabase/server";
import { adminDb } from "./supabase/admin";

export type TeamUser = { id: string; email: string };

// Signed-in AND listed in team_members. Signing up alone grants nothing.
export async function getTeamUser(): Promise<TeamUser | null> {
  const supabase = await authClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const { data: member } = await adminDb()
    .from("team_members")
    .select("user_id, email")
    .eq("user_id", userId)
    .maybeSingle();
  return member ? { id: member.user_id, email: member.email } : null;
}

export async function requireTeamUser(): Promise<TeamUser> {
  const user = await getTeamUser();
  if (!user) redirect("/login?error=not_team");
  return user;
}

export async function orgForShareToken(token: string) {
  const { data } = await adminDb().from("orgs").select("id, name").eq("share_token", token).maybeSingle();
  return data;
}
