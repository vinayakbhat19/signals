#!/usr/bin/env bash
# Fest Live: live security smoke test. Tries forbidden things against your REAL deployment from the outside, like an attacker.
# Run it from your laptop against the STAGING (or preview) deployment first, then once against production before the fest.
#   SUPABASE_URL=https://xxxx.supabase.co ANON_KEY=... SITE_URL=https://fiesta26.pages.dev \
#   [STUDENT_EMAIL=... STUDENT_PASSWORD=...] [STAFF_API=https://fiesta-staff.xxx.workers.dev] bash security/smoke_test.sh
# Every line must say PASS. It only reads and tries forbidden writes; with a student login it never changes real data (writes are refused).
set -u
: "${SUPABASE_URL:?set SUPABASE_URL}"; : "${ANON_KEY:?set ANON_KEY}"; : "${SITE_URL:?set SITE_URL}"
PASS=0; FAIL=0
curl -sS -m 15 -o /dev/null -H "apikey: $ANON_KEY" "$SUPABASE_URL/rest/v1/" 2>/dev/null || { echo "STOP: cannot reach SUPABASE_URL ($SUPABASE_URL). Check the address and your internet."; exit 2; }
curl -sS -m 15 -o /dev/null "$SITE_URL/" 2>/dev/null || { echo "STOP: cannot reach SITE_URL ($SITE_URL). Check the address and your internet."; exit 2; }
ok()   { echo "PASS  $1"; PASS=$((PASS+1)); }
bad()  { echo "FAIL  $1"; FAIL=$((FAIL+1)); }
H_ANON=(-H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY")

# blocked <label> <expected> : reads $CODE and $BODY. "Blocked" = HTTP 4xx, or an empty list, or an error body (nothing useful returned).
check_read() {  # label
  if [[ "$CODE" =~ ^(401|403|404|400)$ ]] || [[ "$BODY" == "[]" ]] || [[ "$BODY" == "" ]]; then ok "$1"; else bad "$1  (HTTP $CODE, body starts: ${BODY:0:80})"; fi; }
get()  { local out; out=$(curl -sS -m 20 -w '\n%{http_code}' "$@" 2>/dev/null) || { CODE=000; BODY=""; return; }; CODE=${out##*$'\n'}; BODY=${out%$'\n'*}; }

echo "== A. The signed-out visitor (anon key) must not read private data"
for t in "polls?select=secret" "stamp_points?select=*" "stamps?select=*" "votes?select=*" "push_subscriptions?select=*" "push_queue?select=*" "audit_log?select=*" \
         "rate_limits?select=*" "staff_invites?select=*" "host_invites?select=*" "participants?select=email,phone" "profiles?select=email" "signals?select=contact" "signal_responses?select=*" "app_settings?select=*"; do
  get "${H_ANON[@]}" "$SUPABASE_URL/rest/v1/$t"; check_read "anon cannot read $t"; done
echo "== B. The signed-out visitor must not write"
for t in "events" "announcements" "votes" "stamps" "profiles" "polls"; do
  get -X POST "${H_ANON[@]}" -H 'Content-Type: application/json' -d '{}' "$SUPABASE_URL/rest/v1/$t"
  if [[ "$CODE" =~ ^(401|403|404|400|409)$ ]]; then ok "anon cannot insert into $t"; else bad "anon insert into $t gave HTTP $CODE"; fi; done
get -X PATCH "${H_ANON[@]}" -H 'Content-Type: application/json' -d '{"writes_paused":true}' "$SUPABASE_URL/rest/v1/app_config?id=eq.1"
if [[ "$CODE" =~ ^(401|403|404|400)$ ]] || [[ "$BODY" == "[]" ]]; then ok "anon cannot change app_config (kill switch)"; else bad "anon changed app_config? HTTP $CODE"; fi
for f in cast_vote claim_stamp hunt_winners list_stamp_qrs rotate_stamp_code host_set_voting host_update_event archive_and_purge_fest rate_hit invite_volunteer delete_my_account save_push_subscription; do
  get -X POST "${H_ANON[@]}" -H 'Content-Type: application/json' -d '{}' "$SUPABASE_URL/rest/v1/rpc/$f"
  if [[ "$CODE" =~ ^(401|403|404|400)$ ]]; then ok "anon cannot call $f"; else bad "anon call of $f gave HTTP $CODE"; fi; done
echo "== C. Public calls work and expose nothing private"
get -X POST "${H_ANON[@]}" -H 'Content-Type: application/json' -d '{}' "$SUPABASE_URL/rest/v1/rpc/app_status"; [[ "$CODE" == 200 ]] && ok "app_status works" || bad "app_status HTTP $CODE"
get -X POST "${H_ANON[@]}" -H 'Content-Type: application/json' -d '{}' "$SUPABASE_URL/rest/v1/rpc/live_feed"
if [[ "$CODE" == 200 ]]; then ok "live_feed works"; else bad "live_feed HTTP $CODE"; fi
if echo "$BODY" | grep -Eqi '"(email|phone|secret|password|code|clue|hint)"'; then bad "live_feed contains a private-looking field"; else ok "live_feed has no email/phone/secret/clue fields"; fi
get -X POST "${H_ANON[@]}" -H 'Content-Type: application/json' -d '{}' "$SUPABASE_URL/rest/v1/rpc/my_hunt"
if echo "$BODY" | grep -q '"place":"[^"]'; then bad "my_hunt reveals a place name to a signed-out user"; else ok "my_hunt shows clues but no place names when signed out"; fi
get "${H_ANON[@]}" "$SUPABASE_URL/rest/v1/stamp_leaderboard?select=*&limit=3"
if echo "$BODY" | grep -Eq '"(user_id|email)"'; then bad "leaderboard exposes user_id or email"; else ok "leaderboard exposes no user_id or email"; fi
get "${H_ANON[@]}" "$SUPABASE_URL/rest/v1/events?select=*&limit=500"
if [[ "$CODE" == 200 ]]; then n=$(echo "$BODY" | grep -o '"id"' | wc -l); [[ "$n" -le 500 ]] && ok "reads are capped (got $n rows for limit=500)" || bad "more rows than asked"; fi
echo "== D. Signed-in student (needs STUDENT_EMAIL and STUDENT_PASSWORD)"
if [[ -n "${STUDENT_EMAIL:-}" && -n "${STUDENT_PASSWORD:-}" ]]; then
  get -X POST -H "apikey: $ANON_KEY" -H 'Content-Type: application/json' -d "{\"email\":\"$STUDENT_EMAIL\",\"password\":\"$STUDENT_PASSWORD\"}" "$SUPABASE_URL/auth/v1/token?grant_type=password"
  TOKEN=$(echo "$BODY" | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p'); UID_=$(echo "$BODY" | sed -n 's/.*"user":{"id":"\([^"]*\)".*/\1/p')
  if [[ -z "$TOKEN" ]]; then bad "could not log in the test student"; else
    H_S=(-H "apikey: $ANON_KEY" -H "Authorization: Bearer $TOKEN")
    ok "student logged in"
    get "${H_S[@]}" "$SUPABASE_URL/rest/v1/profiles?select=id,role"; n=$(echo "$BODY" | grep -o '"id"' | wc -l); [[ "$n" -le 1 ]] && ok "student sees only their own profile" || bad "student sees $n profiles"
    for t in "stamp_points?select=*" "participants?select=email,phone" "push_subscriptions?select=*" "audit_log?select=*" "staff_invites?select=*" "polls?select=secret"; do
      get "${H_S[@]}" "$SUPABASE_URL/rest/v1/$t"; check_read "student cannot read $t"; done
    get -X PATCH "${H_S[@]}" -H 'Content-Type: application/json' -H 'Prefer: return=representation' -d '{"role":"admin"}' "$SUPABASE_URL/rest/v1/profiles?id=eq.$UID_"
    if [[ "$CODE" =~ ^(401|403|404|400)$ ]] || [[ "$BODY" == "[]" ]]; then ok "student cannot make themself admin"; else bad "student role change gave HTTP $CODE: ${BODY:0:80}"; fi
    get -X POST "${H_S[@]}" -H 'Content-Type: application/json' -d "{\"user_id\":\"$UID_\",\"point_id\":\"00000000-0000-0000-0000-000000000000\",\"points\":999}" "$SUPABASE_URL/rest/v1/stamps"
    if [[ "$CODE" =~ ^(401|403|404|400|409)$ ]]; then ok "student cannot insert a stamp"; else bad "student stamp insert HTTP $CODE"; fi
    get -X POST "${H_S[@]}" -H 'Content-Type: application/json' -d '{"p_limit":5}' "$SUPABASE_URL/rest/v1/rpc/hunt_winners"; if [[ "$CODE" =~ ^(401|403|404|400)$ ]]; then ok "student cannot read the winners list"; else bad "winners list HTTP $CODE"; fi
    get -X POST "${H_S[@]}" -H 'Content-Type: application/json' -d '{}' "$SUPABASE_URL/rest/v1/rpc/list_stamp_qrs"; if [[ "$CODE" =~ ^(401|403|404|400)$ ]]; then ok "student cannot list hunt stickers"; else bad "list_stamp_qrs HTTP $CODE"; fi
    if [[ -n "${STAFF_API:-}" ]]; then
      get -X POST -H "Authorization: Bearer $TOKEN" -H "Origin: $SITE_URL" -H 'Content-Type: application/json' -d '{"email":"x@y.zz","password":"Passw0rd12","role":"volunteer"}' "$STAFF_API/staff/create"
      [[ "$CODE" == 403 ]] && ok "staff Worker refuses a student" || bad "staff Worker gave HTTP $CODE to a student"
    fi
  fi
else echo "SKIP  student checks (set STUDENT_EMAIL and STUDENT_PASSWORD of a throw-away test account)"; fi
if [[ -n "${STAFF_API:-}" ]]; then
  get -X POST -H "Origin: $SITE_URL" -H 'Content-Type: application/json' -d '{}' "$STAFF_API/staff/create"; [[ "$CODE" == 401 ]] && ok "staff Worker refuses a call with no login" || bad "staff Worker no-login gave HTTP $CODE"
  get -X POST -H "Origin: https://evil.example" -H 'Content-Type: application/json' -d '{}' "$STAFF_API/staff/create"; [[ "$CODE" == 403 ]] && ok "staff Worker refuses another website" || bad "staff Worker wrong-origin gave HTTP $CODE"
fi
echo "== E. The website: headers and what the browser downloads"
HDR=$(curl -sS -m 20 -I "$SITE_URL/" 2>/dev/null | tr -d '\r' | tr 'A-Z' 'a-z')
for h in "content-security-policy" "strict-transport-security" "x-content-type-options: nosniff" "referrer-policy" "permissions-policy"; do echo "$HDR" | grep -q "$h" && ok "header $h present" || bad "header $h missing"; done
echo "$HDR" | grep -Eq "x-frame-options: deny|frame-ancestors 'none'" && ok "cannot be put in a frame" || bad "frame protection missing"
get "$SITE_URL/"; PAGE="$BODY"
ASSETS=$(echo "$PAGE" | grep -oE '(src|href)="[^"]+\.js[^"]*"' | sed -E 's/^(src|href)="//; s/"$//' | head -30)
ALLJS="$PAGE"; for a in $ASSETS; do [[ "$a" == http* ]] && u="$a" || u="$SITE_URL$a"; get "$u"; ALLJS="$ALLJS"$'\n'"$BODY"; done
if echo "$ALLJS" | grep -Eqi 'service_role|VAPID_PRIVATE|BEGIN (RSA |EC )?PRIVATE KEY'; then bad "a secret name or key appears in the site's files"; else ok "no service_role / private key text in the site's files"; fi
for jwt in $(echo "$ALLJS" | grep -oE 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+' | sort -u); do
  payload=$(echo "$jwt" | cut -d. -f2 | tr '_-' '/+'); pad=$(( (4 - ${#payload} % 4) % 4 )); payload="$payload$(printf '=%.0s' $(seq 1 $pad))"
  role=$(echo "$payload" | base64 -d 2>/dev/null | sed -n 's/.*"role":"\([^"]*\)".*/\1/p'); [[ "$role" == "service_role" ]] && { bad "a SERVICE ROLE key is in the site's files!"; }
done; ok "no service-role token found among the site's JWTs"
echo "$ALLJS" | grep -q 'sourceMappingURL' && bad "source maps are referenced (the original code would be downloadable)" || ok "no source map references"
get "$SITE_URL/.env"; [[ "$CODE" =~ ^(404|403)$ || "$BODY" == *"<!doctype"* || "$BODY" == *"<html"* ]] && ok ".env is not served" || bad ".env returned HTTP $CODE"
get "$SITE_URL/emergency.json"; if [[ "$CODE" == 200 ]]; then echo "$BODY" | grep -Eqi 'password|secret|token|key' && bad "emergency.json contains a sensitive word" || ok "emergency.json is public and has no sensitive words"; else echo "SKIP  emergency.json not found"; fi
echo; echo "RESULT: $PASS passed, $FAIL failed"; [[ "$FAIL" -eq 0 ]]
