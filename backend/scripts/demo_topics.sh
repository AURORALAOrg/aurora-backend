#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

BASE_URL="http://localhost:8000"
HEALTH_URL="${HEALTH_URL:-${BASE_URL}}"
DB_CONTAINER="aurora-db"

echo "[1/8] Ensuring API server is running..."
if ! curl -sSf "${HEALTH_URL}" >/dev/null 2>&1; then
  echo "Server not responding on ${HEALTH_URL}. Starting server..."
  nohup npm run start:prod >/tmp/aurora_server.log 2>&1 &
  echo "Waiting for server to become ready..."
  ready=0
  for _ in {1..30}; do
    if curl -sSf "${HEALTH_URL}" >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done
  if [[ "${ready}" -ne 1 ]]; then
    echo "ERROR: Server did not become ready within timeout." >&2
    exit 1
  fi
fi
echo "Server is up."

echo "[2/8] Logging in to get JWT token..."
LOGIN_EMAIL="${LOGIN_EMAIL:-customer@aurora.com}"
LOGIN_PASSWORD="${LOGIN_PASSWORD:-password123!}"
LOGIN_JSON=$(curl -sfS -X POST "${BASE_URL}/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  --data "{\"email\":\"${LOGIN_EMAIL}\",\"password\":\"${LOGIN_PASSWORD}\"}")
echo "$LOGIN_JSON" | jq . >/tmp/login_response.json || true
TOKEN=$(node -e 'const fs=require("fs");try{const j=JSON.parse(fs.readFileSync("/tmp/login_response.json","utf8"));console.log(j.data.token||j.token||"")}catch(e){console.log("")}')
if [[ -z "${TOKEN}" ]]; then
  echo "ERROR: Could not obtain token. See /tmp/login_response.json" >&2
  exit 1
fi
echo "Token acquired."

AUTH_HEADER=( -H "Authorization: Bearer ${TOKEN}" )

echo "[3/8] List all topics..."
curl -s "${BASE_URL}/api/v1/topics" "${AUTH_HEADER[@]}" | tee /tmp/topics_all.json | jq . >/dev/null || true

echo "[4/8] Filter topics by level=A1 & category=DAILY_LIFE..."
curl -s "${BASE_URL}/api/v1/topics?level=A1&category=DAILY_LIFE" "${AUTH_HEADER[@]}" | tee /tmp/topics_filter.json | jq . >/dev/null || true

echo "[5/8] Get topics by level (A1)..."
curl -s "${BASE_URL}/api/v1/topics/level/A1" "${AUTH_HEADER[@]}" | tee /tmp/topics_level.json | jq . >/dev/null || true

TOPIC_ID=$(node -e 'const fs=require("fs");try{const j=JSON.parse(fs.readFileSync("/tmp/topics_all.json","utf8"));const t=(j.data&&j.data.topics)||[];console.log(t[0]?.id||"")}catch(e){console.log("")}')
if [[ -n "${TOPIC_ID}" ]]; then
  echo "[6/8] Get topic by id (${TOPIC_ID})..."
  curl -s "${BASE_URL}/api/v1/topics/id/${TOPIC_ID}" "${AUTH_HEADER[@]}" | tee /tmp/topic_by_id.json | jq . >/dev/null || true
fi

echo "[7/8] Create, Update and Delete a topic..."
CREATE_JSON=$(curl -s -X POST "${BASE_URL}/api/v1/topics" "${AUTH_HEADER[@]}" -H 'Content-Type: application/json' \
  --data '{"name":"Work","description":"Office conversations","category":"WORK","englishLevel":"B1","prompts":["Talk about your job role.","Describe a typical day at work."]}')
echo "$CREATE_JSON" | jq . >/tmp/topic_create.json || true
NEW_ID=$(node -e 'const fs=require("fs");try{const j=JSON.parse(fs.readFileSync("/tmp/topic_create.json","utf8"));console.log((j.data&&j.data.topic&&j.data.topic.id)||"")}catch(e){console.log("")}')
if [[ -n "${NEW_ID}" ]]; then
  curl -s -X PUT "${BASE_URL}/api/v1/topics/${NEW_ID}" "${AUTH_HEADER[@]}" -H 'Content-Type: application/json' \
    --data '{"description":"Office and remote work conversations"}' | jq . >/tmp/topic_update.json || true
  curl -s -X DELETE "${BASE_URL}/api/v1/topics/${NEW_ID}" "${AUTH_HEADER[@]}" | jq . >/tmp/topic_delete.json || true
fi

echo "[8/8] Show database evidence (topics rows) via docker psql..."
docker exec -t "${DB_CONTAINER}" psql -U postgres -d aurora_db -c 'SELECT id, name, category, "englishLevel", prompts FROM "Topic" ORDER BY "createdAt" DESC LIMIT 5;' || true

echo "[BONUS] Generate a chat prompt from first topic..."
node -e "const {PrismaClient}=require('@prisma/client');const ChatService=require('./build/src/services/chat.service').default;(async()=>{const p=new PrismaClient();const t=await p.topic.findFirst();console.log('Topic:',t?.name);console.log('Prompt:\n',ChatService.buildPromptFromTopic(t));await p.\$disconnect();})();"

echo "\nDemo complete. Artifacts saved under /tmp (login_response.json, topics_*.json, topic_*.json)."

