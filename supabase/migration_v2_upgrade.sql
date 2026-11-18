-- Incremental upgrade from Fest Live v1 schema.sql to v2 schema.sql.
-- Safe to run if you already ran the original supabase/schema.sql.
-- Run this first in Supabase SQL Editor, then run:
--   1. supabase/storage.sql
--   2. supabase/schema_participants.sql
--   3. supabase/schema_voting.sql
--   4. supabase/schema_stamps.sql

-- 1. Update handle_new_user so college_verified requires email confirmation
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  domain text;
begin
  select value into domain from public.app_settings where key = 'college_domain';
  insert into public.profiles (id, full_name, avatar_url, email, college_verified)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    new.email,
    new.email_confirmed_at is not null
      and lower(split_part(coalesce(new.email, ''), '@', 2)) = lower(coalesce(domain, ''))
  );
  return new;
end;
$$;

-- 2. Grant verified badge when email/password user confirms their email
create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  domain text;
begin
  select value into domain from public.app_settings where key = 'college_domain';
  update public.profiles
     set college_verified = lower(split_part(coalesce(new.email, ''), '@', 2)) = lower(coalesce(domain, ''))
   where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.handle_user_confirmed();

-- 3. Add cover photo & host fields to public.events
alter table public.events
  add column if not exists cover_url text,
  add column if not exists host_name text check (char_length(host_name) <= 80),
  add column if not exists host_coordinator text check (char_length(host_coordinator) <= 80);
