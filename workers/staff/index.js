// Fiesta'26 Live: staff Worker (Cloudflare Workers).
// The website is static and cannot hold the Supabase service-role key. This tiny Worker lets ONLY the
// main admin create host/volunteer accounts (email + password), reset a password, or remove access.
//
// Secrets (wrangler secret put ...): SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// Variable: ALLOWED_ORIGIN = https://<name>.pages.dev   (the only website allowed to call this)
//
// Every request must carry the admin's own login token (Authorization: Bearer <access token>).
// The Worker asks Supabase who that is, then checks profiles.role = 'admin' with the service key.
// Passwords are never logged and never returned.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ROLES = ['host', 'volunteer', 'organiser'];

const json = (obj, status, origin) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin || 'null',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Cache-Control': 'no-store',
      Vary: 'Origin',
    },
  });

function sbHeaders(env, key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...extra };
}

async function whoIsCaller(env, token) {
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? u.id : null;
}

async function isAdmin(env, uid) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}&select=role`, { headers: sbHeaders(env, env.SUPABASE_SERVICE_ROLE_KEY) });
  if (!r.ok) return false;
  const rows = await r.json();
  return Array.isArray(rows) && rows[0] && rows[0].role === 'admin';
}

async function audit(env, actor, action, target, detail) {
  // never put a password in detail
  await fetch(`${env.SUPABASE_URL}/rest/v1/audit_log`, {
    method: 'POST',
    headers: sbHeaders(env, env.SUPABASE_SERVICE_ROLE_KEY, { Prefer: 'return=minimal' }),
    body: JSON.stringify({ actor, action, target, detail }),
  }).catch(() => {});
}

function validPassword(p) {
  return typeof p === 'string' && p.length >= 8 && p.length <= 72 && /[0-9]/.test(p) && /[A-Za-z]/.test(p);
}

async function createStaff(env, actor, b) {
  const email = String(b.email || '').trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 120) return [400, { ok: false, reason: 'invalid_email', message: 'That email address does not look right' }];
  if (!validPassword(b.password)) return [400, { ok: false, reason: 'weak_password', message: 'Password: 8 to 72 characters with a letter and a number' }];
  if (!ROLES.includes(b.role)) return [400, { ok: false, reason: 'bad_role', message: 'Role must be host, volunteer or organiser' }];
  if (b.role === 'host' && !UUID.test(String(b.event_id || ''))) return [400, { ok: false, reason: 'event_required', message: 'Pick the event this host runs' }];
  const name = String(b.full_name || '').trim().slice(0, 80);

  const c = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: sbHeaders(env, env.SUPABASE_SERVICE_ROLE_KEY),
    body: JSON.stringify({ email, password: b.password, email_confirm: true, user_metadata: { full_name: name || email.split('@')[0] } }),
  });
  if (c.status === 422 || c.status === 409) return [409, { ok: false, reason: 'exists', message: 'That email already has an account. Use "Reset password" or add the role from the staff list' }];
  if (!c.ok) return [502, { ok: false, reason: 'auth_error', message: 'Could not create the account. Try again' }];
  const user = await c.json();
  const uid = user.id;

  if (b.role === 'volunteer' || b.role === 'organiser') {
    await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}`, {
      method: 'PATCH', headers: sbHeaders(env, env.SUPABASE_SERVICE_ROLE_KEY, { Prefer: 'return=minimal' }),
      body: JSON.stringify({ role: b.role }),
    });
  } else {
    await fetch(`${env.SUPABASE_URL}/rest/v1/event_hosts`, {
      method: 'POST', headers: sbHeaders(env, env.SUPABASE_SERVICE_ROLE_KEY, { Prefer: 'return=minimal,resolution=ignore-duplicates' }),
      body: JSON.stringify({ event_id: b.event_id, user_id: uid }),
    });
  }
  await audit(env, actor, 'staff_created', uid, { role: b.role, event_id: b.event_id || null, email });
  return [200, { ok: true, user_id: uid, role: b.role }];
}

async function resetPassword(env, actor, b) {
  if (!UUID.test(String(b.user_id || ''))) return [400, { ok: false, reason: 'bad_user' }];
  if (!validPassword(b.password)) return [400, { ok: false, reason: 'weak_password', message: 'Password: 8 to 72 characters with a letter and a number' }];
  if (b.user_id === actor) return [400, { ok: false, reason: 'self', message: 'Change your own password from My account' }];
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${b.user_id}`, {
    method: 'PUT', headers: sbHeaders(env, env.SUPABASE_SERVICE_ROLE_KEY), body: JSON.stringify({ password: b.password }),
  });
  if (!r.ok) return [502, { ok: false, reason: 'auth_error', message: 'Could not change the password' }];
  await audit(env, actor, 'staff_password_reset', b.user_id, {});
  return [200, { ok: true }];
}

async function removeStaff(env, actor, b) {
  if (!UUID.test(String(b.user_id || ''))) return [400, { ok: false, reason: 'bad_user' }];
  if (b.user_id === actor) return [400, { ok: false, reason: 'self', message: 'You cannot remove yourself' }];
  const p = await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${b.user_id}&select=role`, { headers: sbHeaders(env, env.SUPABASE_SERVICE_ROLE_KEY) });
  const rows = p.ok ? await p.json() : [];
  if (rows[0] && rows[0].role === 'admin') return [403, { ok: false, reason: 'admin', message: 'Admins are changed in the Supabase dashboard' }];
  await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${b.user_id}`, {
    method: 'PATCH', headers: sbHeaders(env, env.SUPABASE_SERVICE_ROLE_KEY, { Prefer: 'return=minimal' }), body: JSON.stringify({ role: 'student' }),
  });
  await fetch(`${env.SUPABASE_URL}/rest/v1/event_hosts?user_id=eq.${b.user_id}`, {
    method: 'DELETE', headers: sbHeaders(env, env.SUPABASE_SERVICE_ROLE_KEY, { Prefer: 'return=minimal' }),
  });
  await audit(env, actor, 'staff_removed', b.user_id, {});
  return [200, { ok: true }];
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin');
    const allowed = env.ALLOWED_ORIGIN;
    if (req.method === 'OPTIONS') return json({}, origin === allowed ? 204 : 403, origin === allowed ? origin : null);
    if (origin !== allowed) return json({ ok: false, reason: 'origin' }, 403, null);
    if (req.method !== 'POST') return json({ ok: false, reason: 'method' }, 405, origin);

    const url = new URL(req.url);
    const auth = req.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) return json({ ok: false, reason: 'sign_in' }, 401, origin);

    const text = await req.text();
    if (text.length > 2000) return json({ ok: false, reason: 'too_big' }, 413, origin);
    let body;
    try { body = JSON.parse(text || '{}'); } catch { return json({ ok: false, reason: 'bad_json' }, 400, origin); }

    const uid = await whoIsCaller(env, token);
    if (!uid) return json({ ok: false, reason: 'sign_in' }, 401, origin);
    if (!(await isAdmin(env, uid))) return json({ ok: false, reason: 'not_admin', message: 'Only the main admin can do this' }, 403, origin);

    let result;
    if (url.pathname === '/staff/create') result = await createStaff(env, uid, body);
    else if (url.pathname === '/staff/reset-password') result = await resetPassword(env, uid, body);
    else if (url.pathname === '/staff/remove') result = await removeStaff(env, uid, body);
    else result = [404, { ok: false, reason: 'not_found' }];
    return json(result[1], result[0], origin);
  },
};
