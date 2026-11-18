-- Hotfix for Supabase pg-safeupdate ("DELETE requires a WHERE clause" / 21000)
-- Run once in Supabase SQL Editor to patch archive_and_purge_fest().

create or replace function public.archive_and_purge_fest()
returns jsonb
language plpgsql volatile security definer set search_path = public
as $$
declare
  n_votes int := 0; n_push int; n_contacts int;
begin
  if not public.is_organiser() then
    raise exception 'Not allowed';
  end if;
  if public.current_mode() <> 'campus' then
    raise exception 'Only after the app is in campus mode' using errcode = 'P0001';
  end if;
  if to_regclass('public.votes') is not null then
    insert into public.poll_results_archive (poll_id, event_id, contestant_id, name, votes, percent)
    select c.poll_id, p.event_id, c.id, c.name, count(v.user_id)::int,
           round(100.0 * count(v.user_id) / nullif(sum(count(v.user_id)) over (partition by c.poll_id), 0))::int
      from public.contestants c
      join public.polls p on p.id = c.poll_id
      left join public.votes v on v.contestant_id = c.id
     group by c.poll_id, p.event_id, c.id, c.name
    on conflict (poll_id, contestant_id) do update
      set votes = excluded.votes, percent = excluded.percent, archived_at = now();
    with d as (delete from public.votes where true returning 1) select count(*) into n_votes from d;
  end if;
  with d as (delete from public.push_subscriptions where true returning 1) select count(*) into n_push from d;
  delete from public.push_queue where true;
  delete from public.rate_limits where true;
  with u as (update public.participants set email = null, phone = null
              where email is not null or phone is not null returning 1) select count(*) into n_contacts from u;
  perform public._audit('archive_and_purge', 'fest', jsonb_build_object('votes_deleted', n_votes, 'push_deleted', n_push, 'contacts_cleared', n_contacts));
  return jsonb_build_object('ok', true, 'votes_deleted', n_votes, 'push_deleted', n_push, 'contacts_cleared', n_contacts);
end;
$$;
