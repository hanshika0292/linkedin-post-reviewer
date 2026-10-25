// Usage: node --env-file=.env.local scripts/create-team-member.mjs you@example.com 'a-strong-password'
// Creates (or reuses) a Supabase auth user and adds them to team_members.
import { createClient } from "@supabase/supabase-js";

const [email, password] = process.argv.slice(2);
if (!email) {
  console.error("Usage: npm run add-team-member -- <email> [password]");
  process.exit(1);
}

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let userId;
const { data: created, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
if (created?.user) {
  userId = created.user.id;
  console.log(`Created auth user ${email}`);
} else {
  // Already exists: look them up (and reset password if one was given).
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!existing) {
    console.error(error?.message ?? "Could not create user");
    process.exit(1);
  }
  userId = existing.id;
  if (password) await db.auth.admin.updateUserById(userId, { password });
  console.log(`Using existing auth user ${email}`);
}

const { error: memberError } = await db.from("team_members").upsert({ user_id: userId, email });
if (memberError) {
  console.error(memberError.message);
  process.exit(1);
}
console.log(`${email} is now a team member.`);
