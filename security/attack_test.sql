-- Fest Live: attack test. Tries to do things people must NOT be able to do, as each kind of user.
-- Run after ALL SQL files (and seed.sql) on a TEST database (never production): see security/run_security_tests.sh
-- Every line should say PASS. A FAIL is a hole to fix before the student test.
\set VERBOSITY terse
\pset format unaligned
\pset fieldsep ' | '
\pset tuples_only on
set client_min_messages = warning;

-- ------------------------------------------------ people
insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values
 ('00000000-0000-0000-0000-0000000000a0','admin@t.test','{"full_name":"Admin"}',now()),
 ('00000000-0000-0000-0000-0000000000a1','student1@t.test','{"full_name":"Asha Kumar"}',now()),
 ('00000000-0000-0000-0000-0000000000a2','student2@t.test','{"full_name":"Bala Rao"}',now()),
 ('00000000-0000-0000-0000-0000000000a3','host@t.test','{"full_name":"Host One"}',now()),
 ('00000000-0000-0000-0000-0000000000a4','vol@t.test','{"full_name":"Vol One"}',now());
update profiles set role='admin' where email='admin@t.test';
update profiles set role='volunteer' where email='vol@t.test';
insert into venues(name) values ('Test Stage');
insert into events(code,title,category,venue_id,starts_at,ends_at) select 'A1','Event A','cultural',id,timestamptz '2026-11-25 17:00+05:30',timestamptz '2026-11-25 19:00+05:30' from venues limit 1;
insert into events(code,title,category,venue_id,starts_at,ends_at) select 'B1','Event B','cultural',id,timestamptz '2026-11-26 17:00+05:30',timestamptz '2026-11-26 19:00+05:30' from venues limit 1;
insert into event_hosts(event_id,user_id) select id,'00000000-0000-0000-0000-0000000000a3' from events where code='A1';
insert into participants(event_id,name,email,phone,show_public) select id,'Perf One','perf@private.test','9999999999',true from events where code='A1';
insert into polls(event_id,enabled) select id,true from events where code='A1';
insert into contestants(poll_id,name) select id,'Team X' from polls;
insert into stamp_hunt(opens_at,closes_at) values (now()-interval '1 hour',now()+interval '5 hours');
insert into stamp_points(name,clue) values ('Secret place','A clue');
insert into signals(user_id,display_name,type,body,contact,expires_at) values ('00000000-0000-0000-0000-0000000000a2','Bala','need_teammate','need ML','bala-private@t.test',now()+interval '1 day');
insert into audit_log(action,target) values ('x','y');
insert into push_subscriptions(endpoint,p256dh,auth) values ('https://p.test/1','aaaaaaaaaaaaaaaaaaaaaaaaa','bbbbbbbbbbbb');
insert into stamps(user_id,point_id,points) select '00000000-0000-0000-0000-0000000000a2', id, 10 from stamp_points;
select (select id::text from events where code='A1') as ev_a, (select id::text from events where code='B1') as ev_b,
       (select id::text from polls) as poll, (select id::text from contestants) as c,
       (select id::text from stamp_points) as sp, (select id::text from signals) as sig \gset

create temp table results(label text, outcome text);
grant all on results to public;
-- attack(label, role, user, statement, expectation): 'blocked' = error or 0 rows touched/seen; 'allowed' = works
create or replace function pg_temp.attack(p_label text, p_role text, p_uid text, p_sql text, p_expect text) returns void language plpgsql as $f$
declare n bigint := 0; blocked boolean := false;
begin
  begin
    execute format('set local role %I', p_role);
    perform set_config('request.jwt.claim.sub', coalesce(p_uid,''), true);
    if p_sql ~* '^\s*(select|with)' then
      execute 'select count(*) from (' || p_sql || ') q' into n;
    else
      execute p_sql; get diagnostics n = row_count;
    end if;
    blocked := (n = 0);
  exception when others then blocked := true;
  end;
  reset role;
  insert into results values (p_label, case when (p_expect = 'blocked') = blocked then 'PASS' else 'FAIL  (expected ' || p_expect || ', got ' || case when blocked then 'blocked' else 'allowed' end || ')' end);
end $f$;

-- ================= signed OUT (anon)
select pg_temp.attack('anon reads polls.secret','anon',null,'select secret from polls','blocked');
select pg_temp.attack('anon reads stamp_points (names, clues, codes)','anon',null,'select * from stamp_points','blocked');
select pg_temp.attack('anon reads push_subscriptions','anon',null,'select * from push_subscriptions','blocked');
select pg_temp.attack('anon reads audit_log','anon',null,'select * from audit_log','blocked');
select pg_temp.attack('anon reads rate_limits','anon',null,'select * from rate_limits','blocked');
select pg_temp.attack('anon reads staff_invites','anon',null,'select * from staff_invites','blocked');
select pg_temp.attack('anon reads host_invites','anon',null,'select * from host_invites','blocked');
select pg_temp.attack('anon reads profiles (emails)','anon',null,'select email from profiles','blocked');
select pg_temp.attack('anon reads participants (private emails/phones)','anon',null,'select email, phone from participants','blocked');
select pg_temp.attack('anon reads votes','anon',null,'select * from votes','blocked');
select pg_temp.attack('anon reads stamps','anon',null,'select * from stamps','blocked');
select pg_temp.attack('anon reads signals.contact','anon',null,'select contact from signals','blocked');
select pg_temp.attack('anon reads signal_responses','anon',null,'select * from signal_responses','blocked');
select pg_temp.attack('anon reads app_settings','anon',null,'select * from app_settings','blocked');
select pg_temp.attack('anon reads the public line-up (should work)','anon',null,'select * from participants_public','allowed');
select pg_temp.attack('anon reads events (should work)','anon',null,'select id, title from events','allowed');
select pg_temp.attack('anon reads live_feed (should work)','anon',null,'select live_feed()','allowed');
select pg_temp.attack('anon inserts an event','anon',null,$$insert into events(title,category,starts_at,ends_at) values ('x','fun',now(),now()+interval '1 hour')$$,'blocked');
select pg_temp.attack('anon inserts an announcement','anon',null,$$insert into announcements(message) values ('spam')$$,'blocked');
select pg_temp.attack('anon updates an event','anon',null,$$update events set title='hacked'$$,'blocked');
select pg_temp.attack('anon deletes events','anon',null,'delete from events','blocked');
select pg_temp.attack('anon inserts a vote','anon',null,format($$insert into votes(poll_id,user_id,contestant_id) values (%L,%L,%L)$$,:'poll','00000000-0000-0000-0000-0000000000a1',:'c'),'blocked');
select pg_temp.attack('anon inserts a stamp','anon',null,format($$insert into stamps(user_id,point_id,points) values (%L,%L,999)$$,'00000000-0000-0000-0000-0000000000a1',:'sp'),'blocked');
select pg_temp.attack('anon writes through the line-up view','anon',null,$$update participants_public set name='x'$$,'blocked');
select pg_temp.attack('anon calls cast_vote','anon',null,format('select cast_vote(%L,%L)',:'poll',:'c'),'blocked');
select pg_temp.attack('anon calls claim_stamp','anon',null,format('select claim_stamp(%L,%L)',:'sp','x'),'blocked');
select pg_temp.attack('anon calls hunt_winners','anon',null,'select * from hunt_winners(5)','blocked');
select pg_temp.attack('anon calls list_stamp_qrs','anon',null,'select * from list_stamp_qrs()','blocked');
select pg_temp.attack('anon calls rotate_stamp_code','anon',null,format('select rotate_stamp_code(%L)',:'sp'),'blocked');
select pg_temp.attack('anon calls host_set_voting','anon',null,format('select host_set_voting(%L,true)',:'ev_a'),'blocked');
select pg_temp.attack('anon calls host_update_event','anon',null,format($$select host_update_event(%L, p_status => 'cancelled')$$,:'ev_a'),'blocked');
select pg_temp.attack('anon calls archive_and_purge_fest','anon',null,'select archive_and_purge_fest()','blocked');
select pg_temp.attack('anon calls rate_hit','anon',null,$$select rate_hit('k',1,1)$$,'blocked');
select pg_temp.attack('anon calls save_push_subscription','anon',null,$$select save_push_subscription('https://x.test/1','aaaaaaaaaaaaaaaaaaaaaaaaa','bbbbbbbbbbbb')$$,'blocked');
select pg_temp.attack('anon calls invite_volunteer','anon',null,$$select invite_volunteer('a@b.com')$$,'blocked');
select pg_temp.attack('anon calls delete_my_account','anon',null,'select delete_my_account()','blocked');
select pg_temp.attack('anon updates app_config (kill switch)','anon',null,'update app_config set writes_paused = true','blocked');

-- ================= signed-in STUDENT (student1)
\set s1 00000000-0000-0000-0000-0000000000a1
select pg_temp.attack('student makes themself admin','authenticated',:'s1',$$update profiles set role='admin' where id='00000000-0000-0000-0000-0000000000a1'$$,'blocked');
select pg_temp.attack('student makes themself verified','authenticated',:'s1',$$update profiles set college_verified=true where id='00000000-0000-0000-0000-0000000000a1'$$,'blocked');
select pg_temp.attack('student changes their email column','authenticated',:'s1',$$update profiles set email='x@y.z' where id='00000000-0000-0000-0000-0000000000a1'$$,'blocked');
select pg_temp.attack('student changes their own name (should work)','authenticated',:'s1',$$update profiles set full_name='Asha K' where id='00000000-0000-0000-0000-0000000000a1'$$,'allowed');
select pg_temp.attack('student changes ANOTHER student''s name','authenticated',:'s1',$$update profiles set full_name='pwned' where id='00000000-0000-0000-0000-0000000000a2'$$,'blocked');
select pg_temp.attack('student reads other students (profiles)','authenticated',:'s1',$$select * from profiles where id<>'00000000-0000-0000-0000-0000000000a1'$$,'blocked');
select pg_temp.attack('student inserts a profile','authenticated',:'s1',$$insert into profiles(id,role) values (gen_random_uuid(),'admin')$$,'blocked');
select pg_temp.attack('student inserts a stamp directly','authenticated',:'s1',format($$insert into stamps(user_id,point_id,points) values (%L,%L,999)$$,:'s1',:'sp'),'blocked');
select pg_temp.attack('student inserts a vote directly','authenticated',:'s1',format($$insert into votes(poll_id,user_id,contestant_id) values (%L,%L,%L)$$,:'poll',:'s1',:'c'),'blocked');
select pg_temp.attack('student edits vote counts','authenticated',:'s1','update votes set contestant_id=contestant_id','blocked');
select pg_temp.attack('student deletes stamps','authenticated',:'s1','delete from stamps','blocked');
select pg_temp.attack('student reads stamp_points (names, clues, codes)','authenticated',:'s1','select * from stamp_points','blocked');
select pg_temp.attack('student reads polls.secret','authenticated',:'s1','select secret from polls','blocked');
select pg_temp.attack('student reads participants (private)','authenticated',:'s1','select email, phone from participants','blocked');
select pg_temp.attack('student writes through the line-up view','authenticated',:'s1',$$update participants_public set name='x'$$,'blocked');
select pg_temp.attack('student inserts through the line-up view','authenticated',:'s1',format($$insert into participants_public(event_id,name) values (%L,'fake')$$,:'ev_a'),'blocked');
select pg_temp.attack('student deletes through the line-up view','authenticated',:'s1','delete from participants_public','blocked');
select pg_temp.attack('student reads push tables','authenticated',:'s1','select * from push_subscriptions','blocked');
select pg_temp.attack('student reads audit_log','authenticated',:'s1','select * from audit_log','blocked');
select pg_temp.attack('student reads staff_invites','authenticated',:'s1','select * from staff_invites','blocked');
select pg_temp.attack('student reads another student''s signal contact','authenticated',:'s1','select contact from signals','blocked');
select pg_temp.attack('student gets a contact through the function (not accepted)','authenticated',:'s1',format('select get_signal_contact(%L) where get_signal_contact(%L) is not null',:'sig',:'sig'),'blocked');
select pg_temp.attack('student inserts an event','authenticated',:'s1',$$insert into events(title,category,starts_at,ends_at) values ('x','fun',now(),now()+interval '1 hour')$$,'blocked');
select pg_temp.attack('student edits an event','authenticated',:'s1',$$update events set title='hacked'$$,'blocked');
select pg_temp.attack('student posts an announcement','authenticated',:'s1',$$insert into announcements(message,priority) values ('FAKE urgent','urgent')$$,'blocked');
select pg_temp.attack('student creates a poll','authenticated',:'s1',format($$insert into polls(event_id) values (%L)$$,:'ev_b'),'blocked');
select pg_temp.attack('student adds a contestant','authenticated',:'s1',format($$insert into contestants(poll_id,name) values (%L,'fake')$$,:'poll'),'blocked');
select pg_temp.attack('student edits the hunt settings','authenticated',:'s1','update stamp_hunt set stamp_value = 9999','blocked');
select pg_temp.attack('student turns on the kill switch','authenticated',:'s1','update app_config set writes_paused = true','blocked');
select pg_temp.attack('student changes poll_seconds','authenticated',:'s1','update app_config set poll_seconds = 300','blocked');
select pg_temp.attack('student makes themself a host','authenticated',:'s1',format($$insert into event_hosts(event_id,user_id) values (%L,%L)$$,:'ev_a',:'s1'),'blocked');
select pg_temp.attack('student calls host_update_event','authenticated',:'s1',format($$select host_update_event(%L, p_status => 'cancelled')$$,:'ev_a'),'blocked');
select pg_temp.attack('student calls host_set_voting','authenticated',:'s1',format('select host_set_voting(%L,false)',:'ev_a'),'blocked');
select pg_temp.attack('student calls host_save_contestant','authenticated',:'s1',format($$select host_save_contestant(%L,null,'x')$$,:'ev_a'),'blocked');
select pg_temp.attack('student calls hunt_winners','authenticated',:'s1','select * from hunt_winners(5)','blocked');
select pg_temp.attack('student calls list_stamp_qrs','authenticated',:'s1','select * from list_stamp_qrs()','blocked');
select pg_temp.attack('student calls get_stamp_qr','authenticated',:'s1',format('select 1 where get_stamp_qr(%L) is not null',:'sp'),'blocked');
select pg_temp.attack('student calls rotate_stamp_code','authenticated',:'s1',format('select rotate_stamp_code(%L)',:'sp'),'blocked');
select pg_temp.attack('student calls invite_volunteer','authenticated',:'s1',$$select invite_volunteer('a@b.com')$$,'blocked');
select pg_temp.attack('student calls invite_host','authenticated',:'s1',format($$select invite_host(%L,'a@b.com')$$,:'ev_a'),'blocked');
select pg_temp.attack('student calls archive_and_purge_fest','authenticated',:'s1','select archive_and_purge_fest()','blocked');
select pg_temp.attack('student calls rate_hit','authenticated',:'s1',$$select rate_hit('k',1,1)$$,'blocked');
select pg_temp.attack('student calls rate_limits_cleanup','authenticated',:'s1','select rate_limits_cleanup()','blocked');
select pg_temp.attack('student calls import / admin helper _audit','authenticated',:'s1',$$select _audit('x','y','{}')$$,'blocked');
select pg_temp.attack('student claims a stamp with a wrong code','authenticated',:'s1',format($$select 1 where (claim_stamp(%L,'0000000000000000')->>'ok')::boolean$$,:'sp'),'blocked');
select pg_temp.attack('student claims a stamp for an unknown place','authenticated',:'s1',$$select 1 where (claim_stamp(gen_random_uuid(),'x')->>'ok')::boolean$$,'blocked');
select pg_temp.attack('student votes (should work once)','authenticated',:'s1',format($$select 1 where (cast_vote(%L,%L)->>'ok')::boolean$$,:'poll',:'c'),'allowed');
select pg_temp.attack('student votes for a contestant of another poll','authenticated',:'s1',format($$select 1 where (cast_vote(%L,gen_random_uuid())->>'ok')::boolean$$,:'poll'),'blocked');
select pg_temp.attack('student reads own vote only (should be 1 row)','authenticated',:'s1','select * from votes','allowed');
select pg_temp.attack('student floods save_push_subscription past 5 devices','authenticated',:'s1',
  $$select 1 from generate_series(1,8) g where (save_push_subscription('https://p.test/flood'||g,'aaaaaaaaaaaaaaaaaaaaaaaaa','bbbbbbbbbbbb')->>'ok')::boolean offset 5$$,'blocked');
select pg_temp.attack('student reads the leaderboard view (should work)','authenticated',:'s1','select display_name from stamp_leaderboard','allowed');

-- ================= volunteer (no admin powers)
\set v 00000000-0000-0000-0000-0000000000a4
select pg_temp.attack('volunteer edits an event','authenticated',:'v',$$update events set title='hacked'$$,'blocked');
select pg_temp.attack('volunteer promotes a student','authenticated',:'v',$$update profiles set role='volunteer' where id='00000000-0000-0000-0000-0000000000a2'$$,'blocked');
select pg_temp.attack('volunteer rotates a code','authenticated',:'v',format('select rotate_stamp_code(%L)',:'sp'),'blocked');
select pg_temp.attack('volunteer reads winners (should work)','authenticated',:'v','select * from hunt_winners(5)','allowed');
select pg_temp.attack('volunteer lists sticker links (should work)','authenticated',:'v','select * from list_stamp_qrs()','allowed');

-- ================= host of event A
\set h 00000000-0000-0000-0000-0000000000a3
select pg_temp.attack('host changes THEIR event time (should work)','authenticated',:'h',format($$select 1 where (host_update_event(%L, p_description => 'ok')->>'ok')::boolean$$,:'ev_a'),'allowed');
select pg_temp.attack('host changes ANOTHER event','authenticated',:'h',format($$select host_update_event(%L, p_status => 'cancelled')$$,:'ev_b'),'blocked');
select pg_temp.attack('host edits event table directly','authenticated',:'h',$$update events set title='hacked' where code='A1'$$,'blocked');
select pg_temp.attack('host turns on voting for ANOTHER event','authenticated',:'h',format('select host_set_voting(%L,true)',:'ev_b'),'blocked');
select pg_temp.attack('host reads participants of THEIR event (should work)','authenticated',:'h',format($$select * from participants where event_id=%L$$,:'ev_a'),'allowed');
select pg_temp.attack('host reads participants of ANOTHER event','authenticated',:'h',format($$select * from participants where event_id=%L$$,:'ev_b'),'blocked');
select pg_temp.attack('host rotates a stamp code','authenticated',:'h',format('select rotate_stamp_code(%L)',:'sp'),'blocked');
select pg_temp.attack('host reads who voted for whom','authenticated',:'h','select * from votes','blocked');
select pg_temp.attack('host reads audit_log','authenticated',:'h','select * from audit_log','blocked');

-- ================= results
select outcome, count(*) from results group by outcome order by 1;
select label, outcome from results where outcome <> 'PASS' order by 1;
