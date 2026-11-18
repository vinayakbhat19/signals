// Offline test of the staff Worker with a fake Supabase. Run: node workers/staff/test.mjs
import worker from './index.js';
import assert from 'node:assert/strict';

const ORIGIN = 'https://fest.pages.dev';
const env = { SUPABASE_URL: 'https://sb.test', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service', ALLOWED_ORIGIN: ORIGIN };
const ADMIN = '11111111-1111-1111-1111-111111111111', STUDENT = '22222222-2222-2222-2222-222222222222';
const EVENT = '33333333-3333-3333-3333-333333333333', NEWUSER = '44444444-4444-4444-4444-444444444444';
let calls = [];
globalThis.fetch = async (url, opt = {}) => {
  url = String(url); calls.push({ url, method: opt.method || 'GET', body: opt.body, headers: opt.headers });
  const ok = (o, s = 200) => new Response(JSON.stringify(o), { status: s });
  if (url.endsWith('/auth/v1/user')) {
    const t = opt.headers.Authorization;
    return t === 'Bearer admin-token' ? ok({ id: ADMIN }) : t === 'Bearer student-token' ? ok({ id: STUDENT }) : ok({}, 401);
  }
  if (url.includes('/rest/v1/profiles?id=eq.' + ADMIN)) return ok([{ role: 'admin' }]);
  if (url.includes('/rest/v1/profiles?id=eq.' + STUDENT)) return ok([{ role: 'student' }]);
  if (url.endsWith('/auth/v1/admin/users')) return JSON.parse(opt.body).email === 'dup@x.com' ? ok({}, 422) : ok({ id: NEWUSER });
  return ok({});
};
const call = (path, body, { token = 'admin-token', origin = ORIGIN, method = 'POST' } = {}) =>
  worker.fetch(new Request('https://w.test' + path, { method, headers: { Origin: origin, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: method === 'POST' ? JSON.stringify(body) : undefined }), env);
const j = async (r) => [r.status, await r.json()];
const good = { email: 'Vol@Gmail.com', password: 'Fiesta2026!', role: 'volunteer', full_name: 'Vol One' };

let [s, b] = await j(await call('/staff/create', good));
assert.equal(s, 200); assert.equal(b.ok, true); assert.equal(b.user_id, NEWUSER);
const created = calls.find((c) => c.url.endsWith('/auth/v1/admin/users'));
assert.equal(JSON.parse(created.body).email, 'vol@gmail.com'); assert.equal(JSON.parse(created.body).email_confirm, true);
assert.ok(calls.some((c) => c.method === 'PATCH' && c.url.includes('profiles?id=eq.' + NEWUSER) && JSON.parse(c.body).role === 'volunteer'));
assert.ok(!calls.filter((c) => c.url.includes('audit_log')).some((c) => c.body.includes('Fiesta2026')), 'password must not be in the audit log');
console.log('ok  admin creates a volunteer (email lowercased, confirmed, role set, no password in audit)');

calls = []; [s, b] = await j(await call('/staff/create', { email: 'h@x.com', password: 'Fiesta2026!', role: 'host', event_id: EVENT }));
assert.equal(s, 200); assert.ok(calls.some((c) => c.url.endsWith('/rest/v1/event_hosts') && JSON.parse(c.body).event_id === EVENT));
console.log('ok  admin creates a host for an event');

[s, b] = await j(await call('/staff/create', { email: 'h@x.com', password: 'Fiesta2026!', role: 'host' })); assert.equal(s, 400); assert.equal(b.reason, 'event_required');
[s, b] = await j(await call('/staff/create', { ...good, password: 'short1' })); assert.equal(b.reason, 'weak_password');
[s, b] = await j(await call('/staff/create', { ...good, password: 'onlyletters' })); assert.equal(b.reason, 'weak_password');
[s, b] = await j(await call('/staff/create', { ...good, email: 'nope' })); assert.equal(b.reason, 'invalid_email');
[s, b] = await j(await call('/staff/create', { ...good, role: 'admin' })); assert.equal(b.reason, 'bad_role');
[s, b] = await j(await call('/staff/create', { ...good, email: 'dup@x.com' })); assert.equal(s, 409); assert.equal(b.reason, 'exists');
console.log('ok  validation: event required, weak passwords, bad email, admin role refused, duplicate email');

[s, b] = await j(await call('/staff/create', good, { token: 'student-token' })); assert.equal(s, 403); assert.equal(b.reason, 'not_admin');
[s, b] = await j(await call('/staff/create', good, { token: 'bad-token' })); assert.equal(s, 401);
[s, b] = await j(await call('/staff/create', good, { origin: 'https://evil.example' })); assert.equal(s, 403);
const r = await worker.fetch(new Request('https://w.test/staff/create', { method: 'POST', headers: { Origin: ORIGIN }, body: '{}' }), env); assert.equal(r.status, 401);
[s, b] = await j(await call('/staff/create', good, { method: 'GET' })); assert.equal(s, 405);
console.log('ok  student refused, bad token refused, wrong website refused, no token refused, GET refused');

calls = []; [s, b] = await j(await call('/staff/reset-password', { user_id: NEWUSER, password: 'NewPass2026' })); assert.equal(s, 200);
assert.ok(calls.some((c) => c.method === 'PUT' && c.url.endsWith('/auth/v1/admin/users/' + NEWUSER)));
[s, b] = await j(await call('/staff/reset-password', { user_id: ADMIN, password: 'NewPass2026' })); assert.equal(b.reason, 'self');
console.log('ok  reset password (and not for yourself)');

calls = []; [s, b] = await j(await call('/staff/remove', { user_id: NEWUSER })); assert.equal(s, 200);
assert.ok(calls.some((c) => c.method === 'PATCH' && JSON.parse(c.body).role === 'student'));
assert.ok(calls.some((c) => c.method === 'DELETE' && c.url.includes('event_hosts?user_id=eq.' + NEWUSER)));
[s, b] = await j(await call('/staff/remove', { user_id: ADMIN })); assert.equal(b.reason, 'self');
[s, b] = await j(await call('/staff/nothing', {})); assert.equal(s, 404);
console.log('ok  remove access (role back to student, host rows deleted), not yourself');
const big = await call('/staff/create', { ...good, full_name: 'x'.repeat(3000) }); assert.equal(big.status, 413);
console.log('ok  oversized body refused');
console.log('ALL STAFF WORKER TESTS PASSED');
