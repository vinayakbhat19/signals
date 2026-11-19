-- Fest Live: make YOURSELF the main admin. Run in Supabase -> SQL Editor AFTER schema_ops.sql.
--
-- 1. Replace the email below with the email address you will sign up with (email + password + the 6-digit code).
-- 2. Run it. Then sign in to the app with that email: your role becomes 'admin' the moment the email is confirmed
--    (entering the 6-digit code confirms it). If you already signed in before running this, the last line fixes your role now.
-- 3. You can then open /admin/ (the Admin page: staff accounts, hunt places, safety panel, archive).
-- Only the Supabase dashboard (SQL Editor) can create an admin; nobody can make themselves admin from the app.

insert into public.staff_invites (email, role) values (lower('YOUR_EMAIL@gmail.com'), 'admin')
on conflict (email) do update set role = 'admin', accepted_at = null, accepted_by = null;

update public.profiles set role = 'admin' where lower(email) = lower('YOUR_EMAIL@gmail.com');
