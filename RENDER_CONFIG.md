# Render Build Configuration

## Build Command
```bash
npm install && npm run build
```

## Start Command (for Worker Service)
```bash
node dist/worker/bot-engine.js
```

## Environment Variables Required

### Supabase
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

### Google Gemini
- `GEMINI_API_KEY`

### Telegram (Optional)
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

## Service Configuration

### Frontend (Static Site)
- **Build Command:** `npm run build:frontend`
- **Publish Directory:** `dist`

### Worker (Background Worker)
- **Build Command:** `npm run build:worker`
- **Start Command:** `node dist/worker/bot-engine.js`
- **Type:** Background Worker
- **Auto-Deploy:** Yes

## Notes

1. The project uses two separate TypeScript configurations:
   - `tsconfig.json` - For Vite/React frontend
   - `tsconfig.worker.json` - For Node.js worker

2. The `build` script compiles both frontend and worker
3. All dependencies (including types) are in `dependencies` for Render compatibility
4. Worker runs as a separate background service on Render
