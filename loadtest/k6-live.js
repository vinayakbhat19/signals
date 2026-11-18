/**
 * Fiesta'26 Live — k6 Load Test (RESILIENCE.md section 6)
 * Run against the PREVIEW deployment URL (never production):
 *   k6 run -e BASE_URL=https://preview.example.com -e EVENT_ID=<uuid> loadtest/k6-live.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const EVENT_ID = __ENV.EVENT_ID || '';

export const options = {
  scenarios: {
    read_crowd: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 2000 },
        { duration: '8m', target: 2000 },
        { duration: '30s', target: 0 },
      ],
      exec: 'readCrowd',
    },
    auth_burst: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1m',
      duration: '2m',
      preAllocatedVUs: 30,
      maxVUs: 100,
      exec: 'authBurst',
      startTime: '1m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.005'],
  },
};

export function readCrowd() {
  if (__ITER === 0) {
    const home = http.get(`${BASE_URL}/`);
    check(home, { 'home 200': (r) => r.status === 200 });
  }

  const live = http.get(`${BASE_URL}/api/live`);
  check(live, { 'api/live 200': (r) => r.status === 200 });

  if (EVENT_ID) {
    for (let i = 0; i < 4; i++) {
      sleep(5);
      const vote = http.get(`${BASE_URL}/api/vote/${EVENT_ID}`);
      check(vote, { 'api/vote 200': (r) => r.status === 200 });
    }
  } else {
    sleep(20);
  }
}

export function authBurst() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: `loadtest-${__VU}@example.com`,
      password: 'WrongPassword123',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  // Expect 401 (bad password) or 429 (rate limited), never 5xx
  check(res, {
    'auth no 5xx': (r) => r.status < 500,
  });
}
