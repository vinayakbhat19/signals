# Load tests

Never run these against production. Use a **preview deployment + a separate staging Supabase project** (same schema files, `seed.sql`), so test users and votes never touch real students.

1. Staging project: run the SQL files in launch order, then create one poll with a contestant and note `EVENT_ID`, `POLL_ID`, `CONTESTANT_ID`.
2. `node create-test-users.mjs 2000` (needs the staging service-role key) → `users.json`.
3. Run each scenario alone, watch Supabase, Vercel and Upstash dashboards while it runs:
   `k6 run -e ONLY=readers ... k6-peaks.mjs` then `signin`, `vote`, `registration`.
4. Pass criteria are the thresholds in the script (errors < 1%, read p95 < 800 ms, write p95 < 1.5 s, sign-in p95 < 2.5 s) and:
   - no 429 responses for legitimate users during `signin` (if you see them, a per-IP limit is too low; see `PEAK_LOAD.md`);
   - `votes_counted` = 1,200 and the database shows 1,200 votes;
   - Supabase API requests per second for reads stay low during `readers` (the cache is working).
5. Delete the test users: `node create-test-users.mjs --delete`.
Note: k6 runs from one machine, so the load comes from one IP. That is **harder** on per-IP limits than a real crowd on many phones, but real campus Wi-Fi also shares one IP, so it is a fair test of that risk.
