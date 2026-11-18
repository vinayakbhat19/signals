// k6 load test for the Fiesta'26 Live peaks. Run against a PREVIEW or STAGING deployment, never production.
//   k6 run -e BASE_URL=https://preview.example.app -e SUPABASE_URL=https://xxxx.supabase.co \
//          -e ANON_KEY=... -e EVENT_ID=<uuid> -e POLL_ID=<uuid> -e CONTESTANT_ID=<uuid> \
//          -e USERS_FILE=users.json k6-peaks.mjs
// users.json = [{"email":"...","password":"..."}, ...] created on the STAGING project with create-test-users.mjs.
// Run one scenario at a time with:  -e ONLY=readers | signin | vote | registration
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Trend } from 'k6/metrics';

const BASE = __ENV.BASE_URL;
const SB = __ENV.SUPABASE_URL;
const ANON = __ENV.ANON_KEY;
const EVENT = __ENV.EVENT_ID;
const POLL = __ENV.POLL_ID;
const CONTESTANT = __ENV.CONTESTANT_ID;
const ONLY = __ENV.ONLY || '';

const users = new SharedArray('users', () => JSON.parse(open(__ENV.USERS_FILE || './users.json')));
const votesOk = new Counter('votes_counted');
const signinMs = new Trend('signin_ms', true);

const all = {
  // P1: 2,000 people read the app at once (home, live feed, vote results) for 10 minutes
  readers: {
    executor: 'ramping-vus', startVUs: 0, exec: 'reader',
    stages: [{ duration: '3m', target: 2000 }, { duration: '10m', target: 2000 }, { duration: '1m', target: 0 }],
  },
  // P2: gate rush: 2,000 sign-ins in 15 minutes, with a 1-minute spike of 15 per second
  signin: {
    executor: 'ramping-arrival-rate', startRate: 1, timeUnit: '1s', preAllocatedVUs: 200, maxVUs: 600, exec: 'signIn',
    stages: [{ duration: '5m', target: 2 }, { duration: '1m', target: 15 }, { duration: '9m', target: 2 }],
  },
  // P3: voting: 1,200 votes in 60 seconds (about 20 per second) with signed-in users
  vote: {
    executor: 'constant-arrival-rate', rate: 20, timeUnit: '1s', duration: '60s', preAllocatedVUs: 200, maxVUs: 500, exec: 'castVote',
  },
  // P4: registration opens / event page opened: 400 requests per second on an event page for 30 s
  registration: {
    executor: 'ramping-arrival-rate', startRate: 10, timeUnit: '1s', preAllocatedVUs: 300, maxVUs: 1000, exec: 'eventPage',
    stages: [{ duration: '20s', target: 400 }, { duration: '30s', target: 400 }, { duration: '10s', target: 0 }],
  },
};
const names = { readers: 'readers', signin: 'signin', vote: 'vote', registration: 'registration' };
export const options = {
  scenarios: Object.fromEntries(Object.entries(all).filter(([k]) => !ONLY || k === ONLY)),
  thresholds: {
    'http_req_failed': ['rate<0.01'],                                       // under 1% errors overall
    'http_req_duration{kind:read}': ['p(95)<800'],                          // cached reads
    'http_req_duration{kind:write}': ['p(95)<1500'],                        // votes, stamps
    'signin_ms': ['p(95)<2500'],
    'checks': ['rate>0.99'],
  },
};

const jitter = (s) => s * (0.7 + Math.random() * 0.6);   // spread polling so phones don't all hit at once

export function reader() {
  http.get(`${BASE}/`, { tags: { kind: 'read' } });
  for (let i = 0; i < 40; i++) {
    const r = http.get(`${BASE}/api/live`, { tags: { kind: 'read' } });
    check(r, { 'live 200': (x) => x.status === 200 });
    if (i % 3 === 0) http.get(`${BASE}/api/vote/${EVENT}`, { tags: { kind: 'read' } });
    sleep(jitter(15));
  }
}

function login(u) {
  const t0 = Date.now();
  const r = http.post(`${SB}/auth/v1/token?grant_type=password`, JSON.stringify({ email: u.email, password: u.password }),
    { headers: { apikey: ANON, 'Content-Type': 'application/json' }, tags: { kind: 'write' } });
  signinMs.add(Date.now() - t0);
  return r;
}

export function signIn() {
  const u = users[__ITER % users.length];
  const r = login(u);
  check(r, { 'signed in': (x) => x.status === 200, 'not rate limited': (x) => x.status !== 429 });
}

export function setup() {
  if (ONLY && ONLY !== 'vote') return {};
  // sign in the voters ahead of the vote burst, slowly (this is not the signin scenario)
  const tokens = [];
  for (let i = 0; i < Math.min(users.length, 1200); i++) {
    const r = login(users[i]);
    if (r.status === 200) tokens.push(r.json('access_token'));
    if (i % 10 === 9) sleep(0.5);
  }
  return { tokens };
}

export function castVote(data) {
  const tok = data.tokens[__ITER % data.tokens.length];
  const r = http.post(`${SB}/rest/v1/rpc/cast_vote`, JSON.stringify({ p_poll: POLL, p_contestant: CONTESTANT, p_code: null }),
    { headers: { apikey: ANON, Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, tags: { kind: 'write' } });
  const ok = r.status === 200 && r.json('ok') === true;
  check(r, { 'vote counted or already counted': () => ok || (r.status === 200 && r.json('reason') === 'same') });
  if (ok) votesOk.add(1);
}

export function eventPage() {
  const r = http.get(`${BASE}/events/${EVENT}`, { tags: { kind: 'read' } });
  check(r, { 'event page 200': (x) => x.status === 200 });
}
