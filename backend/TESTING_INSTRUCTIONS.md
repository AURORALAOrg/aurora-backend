## How to run and test

### Requirements
- Node.js 18+ and npm
- Supabase project with PostgreSQL database
- Run all commands from the `backend` directory:
```bash
cd backend
```

### 1) Environment setup
Create `.env` with your Supabase database credentials:
```bash
cat > .env << 'EOF'
SERVER_ENVIRONMENT=DEVELOPMENT
SERVER_PORT=8000
JWT_SECRET_KEY=dev_secret
BCRYPT_SALT_ROUNDS=10
EMAIL_USERNAME=dummy@example.com
EMAIL_PASSWORD=dummy
EMAIL_FROM_ADDRESS=dummy@example.com
AURORA_WEB_APP_BASE_URL=http://localhost:3000
# Replace with your Supabase database URL
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
DB_SSL=true
EOF
```

Install deps:
```bash
npm install
```

### 2) Database setup (Supabase)
Make sure your Supabase database is running and accessible.

### 3) Database (migrate, generate, seed)
```bash
npx prisma migrate dev --schema prisma/schema.prisma --name init_topics
npx prisma generate --schema prisma/schema.prisma
npx prisma db seed --schema prisma/schema.prisma
```

### 4) Build and start API
```bash
npm run build
npm run start:prod
```
Server: `http://localhost:8000`

If you see ENOENT errors about package.json, make sure you're in the `backend` directory.

### 5) Login (get JWT)
Seeded user:
- email: `customer@aurora.com`
- password: `password123!`

```bash
curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  --data '{"email":"customer@aurora.com","password":"password123!"}'
```

Copy `data.token` and export it:
```bash
export TOKEN=PASTE_TOKEN_HERE
```

### 6) Test Topic endpoints

- List all topics
```bash
curl -s http://localhost:8000/api/v1/topics \
  -H "Authorization: Bearer $TOKEN"
```

- Filter by level and category (example)
```bash
curl -s "http://localhost:8000/api/v1/topics?level=A1&category=daily_life" \
  -H "Authorization: Bearer $TOKEN"
```

- Get by level
```bash
curl -s http://localhost:8000/api/v1/topics/level/A1 \
  -H "Authorization: Bearer $TOKEN"
```

- Get by id (replace TOPIC_ID)
```bash
curl -s http://localhost:8000/api/v1/topics/id/TOPIC_ID \
  -H "Authorization: Bearer $TOKEN"
```

- Create topic
```bash
curl -s -X POST http://localhost:8000/api/v1/topics \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  --data '{"name":"Work","description":"Office conversations","category":"daily_life","englishLevel":"B1","prompts":["Talk about your job role.","Describe a typical day at work."]}'
```

- Update topic (replace NEW_ID)
```bash
curl -s -X PUT http://localhost:8000/api/v1/topics/NEW_ID \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  --data '{"description":"Office and remote work conversations"}'
```

- Delete topic (replace NEW_ID)
```bash
curl -s -X DELETE http://localhost:8000/api/v1/topics/NEW_ID \
  -H "Authorization: Bearer $TOKEN"
```

### 7) Database verification
You can verify the data in your Supabase dashboard under the "Table Editor" section, or use the Supabase CLI:

```bash
# If you have Supabase CLI installed
supabase db reset --linked
# Or check the Supabase dashboard for the Topic table data
```

### 8) How the Chat Prompt System Works

The topic-based AI chat system works as follows:

1. **Topics are stored** with categories (daily_life, grammar, vocabulary) and English levels (A1-C2)
2. **Each topic has prompts** - conversation starters for AI practice
3. **Users select topics** based on their interests and English level
4. **The system generates contextual prompts** using the selected topic's prompts
5. **AI conversations** are tailored to the user's level and interests

Example flow:
- User selects "Food & Restaurants" topic (A1 level)
- System provides prompts like "You are at a restaurant. Order your favorite meal."
- AI responds appropriately for A1 level conversations
- User practices real-world scenarios in a structured way

### 9) Optional: one-command demo
This runs the flow, logs in, exercises endpoints, prints DB evidence, and generates a sample prompt.
```bash
HEALTH_URL=http://localhost:8000 ./scripts/demo_topics.sh
```
