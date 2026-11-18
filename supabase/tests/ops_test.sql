-- Tests: treasure hunt (static QR, clues), volunteers by email, who may make QR, winners, voting without verification, host updates, registration windows.
-- Run with supabase/tests/run_tests.sh (local Postgres) after applying the SQL files in launch order.
\set VERBOSITY terse
insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values
 ('00000000-0000-0000-0000-00000000000f','org@gmail.com','{"full_name":"Org"}',now()),
 ('00000000-0000-0000-0000-0000000000e1','vol@gmail.com','{"full_name":"Vol"}',now()),
 ('00000000-0000-0000-0000-00000000000a','asha@gmail.com','{"full_name":"Asha Kumar"}',now()),
 ('00000000-0000-0000-0000-00000000000c','chetan@gmail.com','{"full_name":"Chetan"}',now()),
 ('00000000-0000-0000-0000-0000000000b1','host@gmail.com','{"full_name":"Host One"}',now()),
 ('00000000-0000-0000-0000-0000000000b2','host2@gmail.com','{"full_name":"Host Two"}',now());
update profiles set role='organiser' where email='org@gmail.com';
update profiles set role='volunteer' where email='vol@gmail.com';
select '1 no verification columns needed: everyone is a student', count(*) from profiles where role='student';

-- 2 volunteers by email
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000a';
select '2 student invite_volunteer', invite_volunteer('x@y.com');
reset role;
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000f';
select '2 organiser invites existing account', invite_volunteer('Asha@gmail.com ');
select '2 organiser invites future account', invite_volunteer('later@gmail.com');
select '2 bad email', invite_volunteer('nope');
reset role;
select '2 asha is volunteer now', role from profiles where email='asha@gmail.com';
update profiles set role='student' where email='asha@gmail.com';
insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values ('00000000-0000-0000-0000-0000000000d1','later@gmail.com','{"full_name":"Later"}',null);
select '2b unconfirmed invitee is NOT volunteer', role from profiles where email='later@gmail.com';
update auth.users set email_confirmed_at=now() where email='later@gmail.com';
select '2c confirmed invitee is volunteer', role from profiles where email='later@gmail.com';

-- 3 hunt: static QR, clues, hidden names
insert into stamp_hunt(opens_at,closes_at,min_gap_seconds) values (now()-interval '1h', now()+interval '5h', 45);
insert into stamp_points(name,clue,hint,found_text,sort) values
 ('Library steps','Where silence is loud and stairs are quiet','Books live here','Shhh!',1),
 ('Canteen','Chai o clock','Smells nice','Yum',2),
 ('Fountain','Water but not a lake','Near main gate','Splash',3);
select set_config('t.p1', id::text, false) from stamp_points where sort=1;
select set_config('t.p2', id::text, false) from stamp_points where sort=2;
select set_config('t.c1code', code, false) from stamp_points where sort=1;
select set_config('t.c2code', code, false) from stamp_points where sort=2;
select '3 code is 16 hex chars', bool_and(code ~ '^[0-9a-f]{16}$') from stamp_points;
-- clients cannot read the table (names, clues, codes) directly
set role anon; select '3 anon direct read blocked', count(*) from (select 1) x;
do $$ begin begin perform count(*) from stamp_points; raise notice 'anon read: ALLOWED'; exception when others then raise notice 'anon read blocked'; end; end $$;
reset role;
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000a';
select '3 student direct read sees rows', count(*) from stamp_points;
select '3 passport before: clues yes, names hidden', sort, found, clue, place from my_hunt();
select '3 claim wrong code', claim_stamp(current_setting('t.p1')::uuid, 'deadbeefdeadbeef');
select '3 claim ok', claim_stamp(current_setting('t.p1')::uuid, current_setting('t.c1code'));
select '3 claim again', claim_stamp(current_setting('t.p1')::uuid, current_setting('t.c1code'))->>'reason';
select '3 next place too fast', claim_stamp(current_setting('t.p2')::uuid, current_setting('t.c2code'))->>'reason';
reset role;
update stamps set scanned_at = now() - interval '2 minutes';
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000a';
select '3 next place after gap', claim_stamp(current_setting('t.p2')::uuid, current_setting('t.c2code'))->>'ok';
select '3 passport after: found places named', sort, found, place from my_hunt();
reset role;
set role anon; select '3 anon passport shows clues', sort, found, clue from my_hunt() limit 2; reset role;
-- sequential mode hides later clues
update stamp_hunt set sequential = true;
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000c';
select '3 sequential: new player sees only clue 1', sort, clue is not null as clue_shown, locked from my_hunt();
reset role;
update stamp_hunt set sequential = false;
-- closed hunt
update stamp_hunt set closes_at = now() - interval '1 minute';
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000c';
select '3 hunt closed', claim_stamp(current_setting('t.p1')::uuid, current_setting('t.c1code'))->>'reason';
reset role;
update stamp_hunt set closes_at = now() + interval '5 hours';
-- rotate
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000a';
select '3 student rotate', rotate_stamp_code(current_setting('t.p1')::uuid);
reset role;
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000f';
select '3 organiser rotate', rotate_stamp_code(current_setting('t.p1')::uuid);
reset role;
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000c';
select '3 old sticker dead', claim_stamp(current_setting('t.p1')::uuid, current_setting('t.c1code'))->>'reason';
reset role;

-- 4 who can make QR stickers
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000c';
select '4 plain student can_make_qr', can_make_qr();
do $$ begin begin perform list_stamp_qrs(); raise notice 'student list: ALLOWED'; exception when others then raise notice 'student list blocked'; end; end $$;
reset role;
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-0000000000e1';
select '4 volunteer list', sort, name, path ~ '^/s/\?t=[0-9a-f-]{36}\.[0-9a-f]{16}$' as path_ok from list_stamp_qrs();
select '4 volunteer one qr', get_stamp_qr(current_setting('t.p2')::uuid)->>'ok';
reset role;
select set_config('t.ev', id::text, false) from events where code='C01';
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000f';
select '4 invite host', invite_host(current_setting('t.ev')::uuid, 'host@gmail.com');
reset role;
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-0000000000b1';
select '4 host can_make_qr', can_make_qr();
select '4 host get qr', get_stamp_qr(current_setting('t.p2')::uuid)->>'ok';
reset role;
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-0000000000b2';
select '4 non-host can_make_qr', can_make_qr();
reset role;
-- winners
insert into stamps(user_id,point_id,points,scanned_at) select '00000000-0000-0000-0000-00000000000c', id, 10, now() - interval '30 minutes' from stamp_points on conflict do nothing;
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000a';
do $$ begin begin perform hunt_winners(5); raise notice 'student winners: ALLOWED'; exception when others then raise notice 'student winners blocked'; end; end $$;
reset role;
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-0000000000e1';
select '4 winners', rank, full_name, email, stamps, score, minutes_taken from hunt_winners(5);
reset role;
set role anon; select '4 public leaderboard', display_name, stamps, score from stamp_leaderboard order by score desc; reset role;

-- 5 voting: anyone signed in can vote when the vote is open (no verification, no code)
insert into polls(event_id,enabled) select id,true from events where code='C01';
select '5 defaults', college_only, require_code from polls;
insert into contestants(poll_id,name) select id,'Meera R' from polls;
select set_config('t.poll', id::text, false) from polls;
select set_config('t.c1', id::text, false) from contestants limit 1;
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-0000000000b2';
select '5 any signed-in account votes', cast_vote(current_setting('t.poll')::uuid, current_setting('t.c1')::uuid)->>'ok';
select '5 same vote again', cast_vote(current_setting('t.poll')::uuid, current_setting('t.c1')::uuid)->>'reason';
reset role;
update polls set enabled=false;
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000c';
select '5 voting switched off', cast_vote(current_setting('t.poll')::uuid, current_setting('t.c1')::uuid)->>'reason';
reset role;

-- 6 host updates own event (the event sits on a fest day, as in real data)
update events set starts_at = timestamptz '2026-11-25 17:00+05:30', ends_at = timestamptz '2026-11-25 19:30+05:30', status = 'scheduled' where code='C01';
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000f';
select '6 invite host', invite_host(current_setting('t.ev')::uuid, 'host@gmail.com');
reset role;
delete from event_changes; delete from push_queue;
select set_config('t.main', id::text, false) from venues where name='Main Stage';
select set_config('t.hall', id::text, false) from venues where name='Seminar Hall 1';
select set_config('t.t0', starts_at::text, false) from events where code='C01';
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-0000000000b1';
select '6 host moves time and venue', host_update_event(current_setting('t.ev')::uuid, current_setting('t.t0')::timestamptz + interval '30 min', current_setting('t.t0')::timestamptz + interval '150 min', current_setting('t.hall')::uuid, 'delayed');
reset role;
select '6 alert created', kind, message from event_changes;
select '6 push queued', topic from push_queue;
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-0000000000b1';
select '6b end before start', host_update_event(current_setting('t.ev')::uuid, p_ends_at => now() - interval '10 days');
select '6b outside fest dates', host_update_event(current_setting('t.ev')::uuid, current_setting('t.t0')::timestamptz + interval '400 days', current_setting('t.t0')::timestamptz + interval '400 days 1 hour');
select '6b bad status', host_update_event(current_setting('t.ev')::uuid, p_status => 'published');
select '6b http link', host_update_event(current_setting('t.ev')::uuid, p_registration_url => 'http://insecure.example');
select '6b javascript link', host_update_event(current_setting('t.ev')::uuid, p_registration_url => 'javascript:alert(1)');
select '6b registration window reversed', host_update_event(current_setting('t.ev')::uuid, p_registration_opens_at => now() + interval '2 day', p_registration_closes_at => now() + interval '1 day');
select '6c registration window ok', host_update_event(current_setting('t.ev')::uuid, p_registration_url => 'https://forms.gle/abc', p_registration_opens_at => now(), p_registration_closes_at => now() + interval '2 day');
select '6c direct table update blocked', count(*) from (select 1) x;
update events set title='hacked' where id=current_setting('t.ev')::uuid;
reset role;
select '6c title unchanged', title from events where id=current_setting('t.ev')::uuid;
-- other host / student
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-0000000000b2';
select '7 other host', host_update_event(current_setting('t.ev')::uuid, p_status => 'cancelled');
reset role;
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000a';
select '7 student', host_update_event(current_setting('t.ev')::uuid, p_status => 'cancelled');
reset role;
-- expiry
update app_config set hosts_until = now() - interval '1 minute';
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-0000000000b1';
select '8 host after expiry', host_update_event(current_setting('t.ev')::uuid, p_status => 'scheduled');
reset role;
update app_config set hosts_until = timestamptz '2026-11-30 23:59:59+05:30';
-- flood cap
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-0000000000b1';
do $$ declare i int; r jsonb; begin for i in 1..22 loop r := host_update_event(current_setting('t.ev')::uuid, p_description => 'edit ' || i); end loop; raise notice 'last result: %', r->>'reason'; end $$;
reset role;
select '9 audit host_event_update rows', count(*) from audit_log where action='host_event_update';

-- 10 static hosting support: version, poll interval, live feed, push subscribe from the browser
select '10 status has version and poll_seconds', (app_status()->>'version')::int > 0 as has_version, app_status()->>'poll_seconds' as poll_seconds;
select set_config('t.v1', (app_status()->>'version'), false);
update events set description = 'new text' where code='C01';
select '10 version went up after an event change', (app_status()->>'version')::bigint > current_setting('t.v1')::bigint;
select set_config('t.v2', (app_status()->>'version'), false);
select set_config('t.cfgaudit', count(*)::text, false) from audit_log where action='config_change';
update events set description = 'again' where code='C01';
select '10 bump did not write config audit rows', count(*)::text = current_setting('t.cfgaudit') as same from audit_log where action='config_change';
set role anon;
select '10 live_feed (anon): top-level keys', array(select jsonb_object_keys(live_feed()) order by 1);
select '10 live_feed events', jsonb_array_length(live_feed()->'events') as events, jsonb_array_length(live_feed()->'venues') as venues;
select '10 live_feed event fields', array(select jsonb_object_keys(live_feed()->'events'->0) order by 1);
select '10 live_feed size bytes', length(live_feed()::text);
reset role;
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000f';
update app_config set poll_seconds = 90;
reset role;
select '10 organiser set poll_seconds', app_status()->>'poll_seconds';
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000a';
update app_config set poll_seconds = 10;
reset role;
select '10 student could NOT change poll_seconds', app_status()->>'poll_seconds';
-- push
set role anon;
do $$ begin begin perform save_push_subscription('https://push.example/abc', repeat('a',30), repeat('b',12)); raise notice 'anon push: ALLOWED'; exception when others then raise notice 'anon push blocked'; end; end $$;
reset role;
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000c';
select '10 push ok', save_push_subscription('https://push.example/dev1', repeat('a',30), repeat('b',12), array['changes','urgent','event:00000000-0000-0000-0000-000000000001','evil','vote']);
select '10 push topics sanitised', topics from push_subscriptions where endpoint='https://push.example/dev1';
select '10 push http refused', save_push_subscription('http://push.example/x', repeat('a',30), repeat('b',12))->>'reason';
select '10 push bad keys refused', save_push_subscription('https://push.example/x', 'short', 'x')->>'reason';
do $$ declare i int; r jsonb; begin for i in 2..7 loop r := save_push_subscription('https://push.example/dev' || i, repeat('a',30), repeat('b',12)); end loop; raise notice 'push 7th device result: %', r->>'reason'; end $$;
select '10 push devices stored for this user', count(*) from push_subscriptions where user_id='00000000-0000-0000-0000-00000000000c';
select '10 push remove', remove_push_subscription('https://push.example/dev1');
reset role;
select '10 clients still cannot read push tables', count(*) from (select 1) x;
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000c';
select '10 student sees own push rows (RLS: none)', count(*) from push_subscriptions;
reset role;

-- 11 delete my account
select '11 before', count(*) from profiles where email='kid@school.edu' or email='newbie@gmail.com' or email='host2@gmail.com';
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-0000000000b2';
select '11 student deletes self', delete_my_account();
reset role;
select '11 profile gone', count(*) from profiles where email='host2@gmail.com';
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000f';
select '11 organiser refused', delete_my_account()->>'reason';
reset role;

-- 12 admin bootstrap and staff roles
insert into staff_invites(email, role) values ('boss@gmail.com','admin');
insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values ('00000000-0000-0000-0000-0000000000a1','boss@gmail.com','{"full_name":"Boss"}',now());
select '12 invited admin email becomes admin on sign-in', role from profiles where email='boss@gmail.com';
insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values ('00000000-0000-0000-0000-0000000000a2','imposter@gmail.com','{"full_name":"Imp"}',now());
select '12 other sign-ups stay students', role from profiles where email='imposter@gmail.com';
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000a';
do $$ begin begin insert into staff_invites(email, role) values ('me@gmail.com','admin'); raise notice 'student insert invite: ALLOWED'; exception when others then raise notice 'student insert invite blocked'; end; end $$;
do $$ begin begin update profiles set role='admin' where id='00000000-0000-0000-0000-00000000000a'; raise notice 'student self-promote: ALLOWED'; exception when others then raise notice 'student self-promote blocked'; end; end $$;
reset role;
select '12 student still student', role from profiles where id='00000000-0000-0000-0000-00000000000a';

-- 13 host controls voting for THEIR event only
select set_config('t.ev', id::text, false) from events where code='C01';
delete from polls;
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-0000000000b1';
select '13 host turn on with no teams', host_set_voting(current_setting('t.ev')::uuid, true)->>'reason';
select '13 host adds team', host_save_contestant(current_setting('t.ev')::uuid, null, 'The Raagas', 'CSE', null, 1, true)->>'ok';
select '13 host adds person', host_save_contestant(current_setting('t.ev')::uuid, null, 'Meera R', 'ECE', 'https://img.example/m.webp', 2, true)->>'ok';
select '13 bad photo link', host_save_contestant(current_setting('t.ev')::uuid, null, 'X', null, 'javascript:alert(1)', 3, true)->>'reason';
select '13 host turns voting on, results hidden', host_set_voting(current_setting('t.ev')::uuid, true, 'Vote for your favourite', null, null, 'hidden');
select '13 bad visibility', host_set_voting(current_setting('t.ev')::uuid, true, null, null, null, 'secret')->>'reason';
select '13 bad times', host_set_voting(current_setting('t.ev')::uuid, true, null, now()+interval '2 hours', now()+interval '1 hour')->>'reason';
select '13 host sees live counts although hidden', name, visible, votes from poll_results order by sort;
reset role;
select set_config('t.poll', id::text, false) from polls;
select set_config('t.c1', id::text, false) from contestants order by sort limit 1;
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-0000000000d1';
select '13 student vote while on', cast_vote(current_setting('t.poll')::uuid, current_setting('t.c1')::uuid)->>'ok';
select '13 student sees hidden results as null', name, visible, votes from poll_results order by sort;
reset role;
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-0000000000b1';
select '13 host sees the vote', name, votes from poll_results order by sort;
select '13 host turns voting off', host_set_voting(current_setting('t.ev')::uuid, false);
reset role;
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-0000000000d1';
select '13 student vote after off', cast_vote(current_setting('t.poll')::uuid, current_setting('t.c1')::uuid)->>'reason';
reset role;
-- other host and student cannot
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-0000000000e1';
do $$ begin begin perform host_set_voting(current_setting('t.ev')::uuid, true); raise notice 'volunteer set voting: ALLOWED'; exception when others then raise notice 'volunteer set voting blocked'; end; end $$;
reset role;
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-00000000000a';
do $$ begin begin perform host_save_contestant(current_setting('t.ev')::uuid, null, 'Fake', null, null, 1, true); raise notice 'student save contestant: ALLOWED'; exception when others then raise notice 'student save contestant blocked'; end; end $$;
reset role;
-- push topic signals
set role authenticated; set request.jwt.claim.sub='00000000-0000-0000-0000-0000000000d1';
select '13 push topic signals kept', save_push_subscription('https://push.example/sig', repeat('a',30), repeat('b',12), array['signals','bogus'])->>'ok';
reset role;
select '13 signals topic stored', topics from push_subscriptions where endpoint='https://push.example/sig';
