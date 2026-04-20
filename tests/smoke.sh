#!/usr/bin/env bash
# Tier 2 API smoke test.
# Prereq: npm run dev running on :3000 and ANTHROPIC_API_KEY set.
# Run: bash tests/smoke.sh
set -euo pipefail

BASE="${BASE:-http://localhost:3000}"

# Run from repo root so ./tmp and ./tests paths resolve.
cd "$(dirname "$0")/.."

WORLD_OUT="$(mktemp -t pp_world.XXXXXX.json)"
RETIRE_OUT="$(mktemp -t pp_retire.XXXXXX.json)"
trap 'rm -f "$WORLD_OUT" "$RETIRE_OUT"' EXIT

echo "-- POST $BASE/api/world"
curl -fsS -X POST "$BASE/api/world" \
  -H 'content-type: application/json' \
  --data @tmp/profile.json > "$WORLD_OUT"

jq -e '.root_pebble.type == "MCQ"' "$WORLD_OUT" > /dev/null \
  || { echo "FAIL: root_pebble.type != MCQ"; cat "$WORLD_OUT"; exit 1; }
jq -e '.fertility_band.label == "low"' "$WORLD_OUT" > /dev/null \
  || { echo "FAIL: fertility_band.label != low (age 27 should be 'low')"; cat "$WORLD_OUT"; exit 1; }
jq -e '.root_pebble.state_snapshot.age == 27' "$WORLD_OUT" > /dev/null \
  || { echo "FAIL: initial state age != 27"; cat "$WORLD_OUT"; exit 1; }
jq -e '(.root_pebble.options | length) >= 2' "$WORLD_OUT" > /dev/null \
  || { echo "FAIL: fewer than 2 options"; cat "$WORLD_OUT"; exit 1; }
echo "   world OK"

echo ""
echo "-- POST $BASE/api/pebble/choose (retirement-forcing: state.age=64 retire=65)"
curl -fsS -X POST "$BASE/api/pebble/choose" \
  -H 'content-type: application/json' \
  --data @tests/payloads/retire.json > "$RETIRE_OUT"

jq -e '.next.type == "RETIREMENT"' "$RETIRE_OUT" > /dev/null \
  || { echo "FAIL: next.type != RETIREMENT (A2 guard broken?)"; cat "$RETIRE_OUT"; exit 1; }
jq -e '.next.final_age == 65' "$RETIRE_OUT" > /dev/null \
  || { echo "FAIL: next.final_age != 65"; cat "$RETIRE_OUT"; exit 1; }
jq -e '(.next.achievements | length) >= 1 and (.next.achievements | length) <= 4' "$RETIRE_OUT" > /dev/null \
  || { echo "FAIL: achievements length out of [1,4]"; cat "$RETIRE_OUT"; exit 1; }
jq -e '(.next.recap | length) > 0' "$RETIRE_OUT" > /dev/null \
  || { echo "FAIL: empty recap"; cat "$RETIRE_OUT"; exit 1; }
jq -e '.months_advanced == 6 or .months_advanced == 12' "$RETIRE_OUT" > /dev/null \
  || { echo "FAIL: months_advanced not in {6,12}"; cat "$RETIRE_OUT"; exit 1; }
jq -e '.next.stats.career_avg | type == "number"' "$RETIRE_OUT" > /dev/null \
  || { echo "FAIL: stats.career_avg not a number"; cat "$RETIRE_OUT"; exit 1; }
echo "   retire OK"

echo ""
echo "smoke OK"
