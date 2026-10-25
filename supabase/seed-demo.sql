-- Optional demo data: psql "$POSTGRES_URL_NON_POOLING" -f supabase/seed-demo.sql
-- Re-running replaces the existing "Demo Co" org.
delete from orgs where name = 'Demo Co';
with o as (insert into orgs (name) values ('Demo Co') returning id),
p1 as (insert into people (org_id, name, headline) select id, 'Demo Founder', 'Founder & CEO at Demo Co | Helping B2B teams grow on LinkedIn' from o returning id, org_id),
p2 as (insert into people (org_id, name, headline) select id, 'Demo Growth Lead', 'Head of Growth @ Demo Co' from o returning id, org_id)
insert into posts (org_id, person_id, body, media, status, scheduled_for)
select org_id, id, E'We almost shut Demo Co down in 2023.\n\nThree things saved us:\n\n1. We stopped selling to everyone\n2. We talked to 50 customers in 30 days\n3. We said no to a big contract that didn\'t fit\n\nToday we\'re profitable, and I\'m grateful to @[Demo Advisor] for pushing us.\n\nWhat\'s the hardest "no" you\'ve ever said? 👇\n\n#startups #founders #b2b',
  jsonb_build_object('kind','images','images', jsonb_build_array(jsonb_build_object('url','https://picsum.photos/id/1011/1200/800'), jsonb_build_object('url','https://picsum.photos/id/1025/800/800'), jsonb_build_object('url','https://picsum.photos/id/1035/800/800'))),
  'in_review', now() + interval '2 days' from p1
union all
select org_id, id, E'Quick poll for the growth folks: where does your pipeline actually come from?\n\n#marketing #growth',
  '{"kind":"poll","question":"Your #1 pipeline source in 2026?","options":["Outbound","LinkedIn content","Referrals","Paid"],"duration":"1w"}'::jsonb,
  'in_review', now() + interval '4 days' from p2
union all
select org_id, id, E'Internal draft — not visible to the client yet.', '{"kind":"none"}'::jsonb, 'draft', null from p2;
