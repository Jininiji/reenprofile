-- Run this once in Supabase Dashboard → SQL Editor.
create table if not exists public.site_content (
  page text primary key check (page in ('reen', 'rain', 'live', 'actor')),
  content jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.site_content (page, content)
values
  ('reen', '{"identity":"Reen | 레인\\n오시마크 🌂🎐","mood":"마음을 촉촉하게🌫","genre":"방송 장르\\n-노래\\n-잔잔토크","reel_url":"https://www.instagram.com/realityreen84?stkn=cTU0emxmbGoya3Vj"}'::jsonb),
  ('rain', '{"body":"이곳에 미리 지정한 비에 관한 문구를 표시합니다."}'::jsonb),
  ('live', '{"body":"이곳에 미리 지정한 지금의 문구를 표시합니다."}'::jsonb),
  ('actor', '{"body":"이곳에 미리 지정한 역할에 관한 문구를 표시합니다."}'::jsonb)
on conflict (page) do nothing;

alter table public.site_content enable row level security;

grant select on public.site_content to anon, authenticated;
grant update on public.site_content to authenticated;

create policy "Anyone can read website text"
  on public.site_content for select
  to anon, authenticated
  using (true);

create policy "Only the administrator can edit website text"
  on public.site_content for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'yoonjin2686@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'yoonjin2686@gmail.com');
