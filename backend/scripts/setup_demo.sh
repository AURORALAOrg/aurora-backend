#!/usr/bin/env bash
set -euo pipefail

# Ensure script runs from backend root
cd "$(dirname "$0")/.."

# Set seed credentials (can be overridden by user)
export LOGIN_EMAIL="${LOGIN_EMAIL:-customer@aurora.com}"
export LOGIN_PASSWORD="${LOGIN_PASSWORD:-password123!}"
export LOGIN_FIRST_NAME="${LOGIN_FIRST_NAME:-Aurora}"
export LOGIN_LAST_NAME="${LOGIN_LAST_NAME:-Admin}"

echo "🚀 AURORA Topic System Demo Setup"
echo "=================================="

echo "[1/4] Checking if database is ready..."
if ! npx prisma db push --accept-data-loss >/dev/null 2>&1; then
  echo "❌ Database connection failed. Please check your .env file and database connection."
  echo "💡 For Supabase users, ensure your DATABASE_URL is correct."
  exit 1
fi
echo "✅ Database connection successful"

echo "[2/4] Seeding database with test user and topics..."
echo "🔑 Using credentials: ${LOGIN_EMAIL} / ${LOGIN_PASSWORD}"
if ! npx prisma db seed >/dev/null 2>&1; then
  echo "❌ Database seeding failed. Please check the error above."
  exit 1
fi
echo "✅ Database seeded successfully"

echo "[3/4] Building the project..."
if ! npm run build >/dev/null 2>&1; then
  echo "❌ Build failed. Please check the error above."
  exit 1
fi
echo "✅ Project built successfully"

echo "[4/4] Starting the server..."
echo "🚀 Starting server in background..."
nohup npm run start:prod >/tmp/aurora_server.log 2>&1 &

echo "⏳ Waiting for server to become ready..."
ready=0
for i in {1..30}; do
  if curl -sSf "http://localhost:8000" >/dev/null 2>&1; then
    ready=1
    break
  fi
  echo "   Waiting... (${i}/30)"
  sleep 1
done

if [[ "${ready}" -ne 1 ]]; then
  echo "❌ Server did not become ready within timeout."
  echo "📋 Check server logs: tail -f /tmp/aurora_server.log"
  exit 1
fi

echo "✅ Server is ready and running!"

echo ""
echo "🎉 Setup Complete! 🎉"
echo "====================="
echo "📊 Test user created:"
echo "   • Email: ${LOGIN_EMAIL}"
echo "   • Password: ${LOGIN_PASSWORD}"
echo ""
echo "🚀 Server running on: http://localhost:8000"
echo "📋 Server logs: tail -f /tmp/aurora_server.log"
echo ""
echo "🧪 Now you can run the demo:"
echo "   bash scripts/demo_topics.sh"
echo ""
echo "🔍 Or test manually:"
echo "   curl -X POST http://localhost:8000/api/v1/auth/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"${LOGIN_EMAIL}\",\"password\":\"${LOGIN_PASSWORD}\"}'"
echo ""
echo "✅ Everything is ready for testing!"
