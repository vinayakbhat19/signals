// Creates N confirmed test users on a STAGING Supabase project (never production) and writes users.json for k6.
//   SUPABASE_URL=https://xxxx.supabase.co SERVICE_ROLE_KEY=... node create-test-users.mjs 2000
// Delete them afterwards:  node create-test-users.mjs --delete
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
const url = process.env.SUPABASE_URL, key = process.env.SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Set SUPABASE_URL and SERVICE_ROLE_KEY (staging only)'); process.exit(1); }
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const arg = process.argv[2];
if (arg === '--delete') {
  const list = existsSync('users.ids.json') ? JSON.parse(readFileSync('users.ids.json', 'utf8')) : [];
  for (const id of list) await fetch(`${url}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers });
  console.log(`deleted ${list.length} test users`); process.exit(0);
}
const n = Number(arg || 2000), users = [], ids = [];
for (let i = 1; i <= n; i++) {
  const email = `loadtest${i}@example.com`, password = `Lt-${Math.random().toString(36).slice(2)}-${i}`;
  const r = await fetch(`${url}/auth/v1/admin/users`, { method: 'POST', headers,
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: `Load Test ${i}` } }) });
  if (r.ok) { const j = await r.json(); users.push({ email, password }); ids.push(j.id); }
  else console.error(i, r.status, (await r.text()).slice(0, 120));
  if (i % 100 === 0) console.log(`${i}/${n}`);
}
writeFileSync('users.json', JSON.stringify(users)); writeFileSync('users.ids.json', JSON.stringify(ids));
console.log(`created ${users.length} users -> users.json`);
