# Deployment Guide - Render.com

## 🚀 Quick Deploy

### Prerequisites
- GitHub repository connected to Render
- Supabase project created
- Google Gemini API key
- (Optional) Telegram bot configured

## 📦 Deploy Steps

### 1. Create Static Site (Frontend)

1. Go to Render Dashboard → New → Static Site
2. Connect your GitHub repository
3. Configure:
   - **Name:** `trading-app-frontend`
   - **Branch:** `main`
   - **Build Command:** `npm run build:frontend`
   - **Publish Directory:** `dist`
4. Add Environment Variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```
5. Click "Create Static Site"

### 2. Create Background Worker (Bot)

1. Go to Render Dashboard → New → Background Worker
2. Connect the same GitHub repository
3. Configure:
   - **Name:** `trading-bot-worker`
   - **Branch:** `main`
   - **Build Command:** `npm install && npm run build:worker`
   - **Start Command:** `node dist/worker/bot-engine.js`
   - **Instance Type:** Starter (or higher)
4. Add Environment Variables:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   GEMINI_API_KEY=your_gemini_key
   TELEGRAM_BOT_TOKEN=your_telegram_token (optional)
   TELEGRAM_CHAT_ID=your_chat_id (optional)
   ```
5. Click "Create Background Worker"

## 🔧 Build Configuration

The project uses two separate TypeScript configurations:

### Frontend Build
- Config: `tsconfig.json`
- Command: `npm run build:frontend`
- Output: `dist/` (Vite bundle)

### Worker Build
- Config: `tsconfig.worker.json`
- Command: `npm run build:worker`
- Output: `dist/worker/` (Compiled Node.js)

## 📝 Environment Variables

### Required for Frontend
| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |

### Required for Worker
| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side) |
| `GEMINI_API_KEY` | Google Gemini API key |

### Optional for Worker
| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID |

## 🐛 Troubleshooting

### Build Fails with "Cannot find module"
- Ensure all dependencies are in `dependencies`, not `devDependencies`
- Check that `tsconfig.worker.json` exists
- Verify build command: `npm run build:worker`

### Worker Crashes on Start
- Check environment variables are set correctly
- View logs in Render dashboard
- Ensure Supabase credentials are valid

### No Telegram Notifications
- Verify `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set
- Check you've sent `/start` to your bot
- Review worker logs for Telegram errors

## 📊 Monitoring

### Frontend
- Access via: `https://your-app-name.onrender.com`
- Check deployment logs in Render dashboard

### Worker
- View logs: Render Dashboard → Worker → Logs
- Should see: "🤖 Headless Bot Worker Started..."
- Telegram notification on startup (if configured)

## 🔄 Auto-Deploy

Both services auto-deploy on push to `main` branch:
1. Push changes to GitHub
2. Render detects changes
3. Builds and deploys automatically
4. Check deployment status in dashboard

## 💡 Tips

1. **Free Tier Limits:**
   - Static sites: Unlimited
   - Background workers: 750 hours/month
   - Workers sleep after 15 min inactivity (paid plans only for 24/7)

2. **Keep Worker Alive:**
   - Upgrade to paid plan for continuous running
   - Or use external cron job to ping worker

3. **Logs:**
   - Always check logs if something doesn't work
   - Render keeps last 7 days of logs

4. **Database:**
   - Supabase handles all data
   - No database setup needed on Render

## 🆘 Support

- [Render Documentation](https://render.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- Check project `README.md` for local development
