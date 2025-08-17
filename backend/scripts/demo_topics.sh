#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

BASE_URL="http://localhost:8000"
HEALTH_URL="${HEALTH_URL:-${BASE_URL}}"
DB_CONTAINER="aurora-db"

echo "🚀 AURORA Topic System Demo Script"
echo "=================================="

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
echo "✅ Server is up."

echo "[2/8] Logging in to get JWT token..."
LOGIN_EMAIL="${LOGIN_EMAIL:-customer@aurora.com}"
LOGIN_PASSWORD="${LOGIN_PASSWORD:-password123!}"

echo "🔑 Attempting login with: ${LOGIN_EMAIL}"

LOGIN_JSON=$(curl -sfS -X POST "${BASE_URL}/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  --data "{\"email\":\"${LOGIN_EMAIL}\",\"password\":\"${LOGIN_PASSWORD}\"}" \
  -w "\nHTTP_STATUS:%{http_code}")

# Extract HTTP status and response body
HTTP_STATUS=$(echo "$LOGIN_JSON" | tail -n1 | sed 's/.*HTTP_STATUS://')
RESPONSE_BODY=$(echo "$LOGIN_JSON" | sed '$d')

echo "$RESPONSE_BODY" | jq . >/tmp/login_response.json 2>/dev/null || echo "$RESPONSE_BODY" >/tmp/login_response.json

if [[ "${HTTP_STATUS}" -eq 400 ]] || [[ "${HTTP_STATUS}" -eq 401 ]]; then
  echo "❌ Login failed (HTTP ${HTTP_STATUS})"
  echo "📋 Response saved to /tmp/login_response.json"
  echo ""
  echo "🔧 TROUBLESHOOTING:"
  echo "   The user '${LOGIN_EMAIL}' doesn't exist or password is wrong."
  echo ""
  echo "💡 SOLUTION OPTIONS:"
  echo "   Option 1: Create the test user by running:"
  echo "     npx prisma db seed"
  echo ""
  echo "   Option 2: Use your own credentials:"
  echo "     export LOGIN_EMAIL='your-email@example.com'"
  echo "     export LOGIN_PASSWORD='your-password'"
  echo "     bash scripts/demo_topics.sh"
  echo ""
  echo "   Option 3: Check if database is seeded:"
  echo "     npx prisma studio"
  echo ""
  echo "📊 Current login response:"
  cat /tmp/login_response.json
  echo ""
  exit 1
fi

TOKEN=$(node -e 'const fs=require("fs");try{const j=JSON.parse(fs.readFileSync("/tmp/login_response.json","utf8"));console.log(j.data?.token||j.token||"")}catch(e){console.log("")}')

if [[ -z "${TOKEN}" ]]; then
  echo "❌ ERROR: Could not obtain token from response."
  echo "📋 Full response saved to /tmp/login_response.json"
  echo "📊 Response content:"
  cat /tmp/login_response.json
  exit 1
fi

echo "✅ Token acquired successfully!"

AUTH_HEADER=( -H "Authorization: Bearer ${TOKEN}" )

echo "[3/8] List all topics..."
echo "📋 Fetching all topics..."
curl -s "${BASE_URL}/api/v1/topics" "${AUTH_HEADER[@]}" | tee /tmp/topics_all.json | jq . >/dev/null || true

echo "[4/8] Filter topics by level=A1 & category=DAILY_LIFE..."
echo "🔍 Filtering topics by A1 level and DAILY_LIFE category..."
curl -s "${BASE_URL}/api/v1/topics?level=A1&category=DAILY_LIFE" "${AUTH_HEADER[@]}" | tee /tmp/topics_filter.json | jq . >/dev/null || true

echo "[5/8] Get topics by level (A1)..."
echo "📚 Getting topics for A1 level..."
curl -s "${BASE_URL}/api/v1/topics/level/A1" "${AUTH_HEADER[@]}" | tee /tmp/topics_level.json | jq . >/dev/null || true

TOPIC_ID=$(node -e 'const fs=require("fs");try{const j=JSON.parse(fs.readFileSync("/tmp/topics_all.json","utf8"));const t=(j.data&&j.data.topics)||[];console.log(t[0]?.id||"")}catch(e){console.log("")}')

if [[ -n "${TOPIC_ID}" ]]; then
  echo "[6/8] Get topic by id (${TOPIC_ID})..."
  echo "🔍 Fetching topic details for ID: ${TOPIC_ID}"
  curl -s "${BASE_URL}/api/v1/topics/id/${TOPIC_ID}" "${AUTH_HEADER[@]}" | tee /tmp/topic_by_id.json | jq . >/dev/null || true
else
  echo "[6/8] Skipping topic by ID (no topics found)"
fi

echo "[7/8] Create, Update and Delete a topic..."
echo "➕ Creating new topic..."
CREATE_JSON=$(curl -s -X POST "${BASE_URL}/api/v1/topics" "${AUTH_HEADER[@]}" -H 'Content-Type: application/json' \
  --data '{"name":"Work","description":"Office conversations","category":"WORK","englishLevel":"B1","prompts":["Talk about your job role.","Describe a typical day at work."]}')

echo "$CREATE_JSON" | jq . >/tmp/topic_create.json 2>/dev/null || echo "$CREATE_JSON" >/tmp/topic_create.json

echo "📋 Create response saved to /tmp/topic_create.json"

NEW_ID=$(node -e 'const fs=require("fs");try{const j=JSON.parse(fs.readFileSync("/tmp/topic_create.json","utf8"));console.log((j.data&&j.data.topic&&j.data.topic.id)||"")}catch(e){console.log("")}')

if [[ -n "${NEW_ID}" ]]; then
  echo "✏️ Updating topic ${NEW_ID}..."
  curl -s -X PUT "${BASE_URL}/api/v1/topics/id/${NEW_ID}" "${AUTH_HEADER[@]}" -H 'Content-Type: application/json' \
    --data '{"description":"Office and remote work conversations"}' | jq . >/tmp/topic_update.json 2>/dev/null || true
  
  echo "🗑️ Deleting topic ${NEW_ID}..."
  curl -s -X DELETE "${BASE_URL}/api/v1/topics/id/${NEW_ID}" "${AUTH_HEADER[@]}" | jq . >/tmp/topic_delete.json 2>/dev/null || true
else
  echo "⚠️ Could not create topic, skipping update/delete"
fi

echo "[8/8] Database check..."
# Try Docker first (for local development)
if command -v docker >/dev/null 2>&1 && docker ps | grep -q "${DB_CONTAINER}"; then
  echo "🐳 Using Docker database connection..."
  docker exec -t "${DB_CONTAINER}" psql -U postgres -d aurora_db -c 'SELECT id, name, category, "englishLevel", prompts FROM "Topic" ORDER BY "createdAt" DESC LIMIT 5;' || true
else
  echo "🐳 Docker not available or container not running."
  echo "📊 For Supabase users: Check your database dashboard at https://supabase.com/dashboard"
  echo "   Navigate to Table Editor > Topic table to see the data"
  echo "   Or use the API response above to verify data creation"
fi

echo "[BONUS] Generate a chat prompt from first topic..."
if command -v node >/dev/null 2>&1; then
  echo "🤖 Generating AI chat prompt..."
  node -e "const {PrismaClient}=require('@prisma/client');const ChatService=require('./build/src/services/chat.service').default;(async()=>{const p=new PrismaClient();const t=await p.topic.findFirst();console.log('Topic:',t?.name);console.log('Prompt:\n',ChatService.buildPromptFromTopic(t));await p.\$disconnect();})();" 2>/dev/null || echo "⚠️ Could not generate chat prompt (check if build exists)"
else
  echo "⚠️ Node.js not available, skipping chat prompt generation"
fi

echo ""
echo "🎉 Demo complete! 🎉"
echo "====================="
echo "📁 Artifacts saved under /tmp:"
echo "   • login_response.json - Login attempt details"
echo "   • topics_all.json - All topics response"
echo "   • topics_filter.json - Filtered topics response"
echo "   • topics_level.json - Topics by level response"
echo "   • topic_by_id.json - Individual topic response"
echo "   • topic_create.json - Topic creation response"
echo "   • topic_update.json - Topic update response"
echo "   • topic_delete.json - Topic deletion response"
echo ""
echo "📊 Database data: Check Supabase dashboard or use the API responses above."
echo "🔑 Login credentials used: ${LOGIN_EMAIL}"
echo ""
echo "✅ If you see all steps completed successfully, the topic system is working!"

