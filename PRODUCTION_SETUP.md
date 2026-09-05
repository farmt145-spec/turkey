# 🚀 Bloody Turkey - Production Setup Guide

## Quick Start (5 minutes)

This guide will get your application deployed with Railway (database) and Netlify (frontend).

---

## Step 1: Create Database on Railway ⚙️

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (recommended)
3. Click **New Project** → Select **Empty Project**
4. Name it: `turkey-production`
5. Click **+ New** → Select **Database** → **MySQL**
6. Wait for MySQL to start (shows "Running" status)
7. Click on MySQL service → **Variables** tab
8. Copy the `DATABASE_URL` value

**Example format:**
```
mysql://user:password@hostname.railway.internal:3306/railway
```

---

## Step 2: Generate Security Secrets 🔐

Run this in your terminal:

```bash
node scripts/generate-secrets.js
```

You'll get output like:
```
SESSION_SECRET=abc123def456...
API_KEY_PEPPER=xyz789uvw012...
```

**Save these values!** You'll need them in the next step.

---

## Step 3: Connect to Netlify 🌐

1. Go to [netlify.com](https://app.netlify.com)
2. Click **Add new site** → **Import an existing project**
3. Select GitHub repository: `farmt145-spec/turkey`
4. Build settings:
   - **Base directory:** `app`
   - **Build command:** `npm install --legacy-peer-deps && npm run build`
   - **Publish directory:** `dist/public`
   - **Functions directory:** `netlify/functions`

5. Click **Save & Deploy** (it will fail because no env vars yet - that's OK)

---

## Step 4: Add Environment Variables to Netlify ⚙️

1. In Netlify site dashboard → **Site configuration** → **Environment variables**
2. Add these variables one by one:

```
DATABASE_TYPE = mysql

DATABASE_URL = [paste your Railway DATABASE_URL here]

SESSION_SECRET = [paste from generate-secrets.js]

API_KEY_PEPPER = [paste from generate-secrets.js]

NODE_ENV = production

DEMO_MODE = true

DEMO_COMPANY_ID = 1

VITE_DEMO_MODE = true
```

**Make sure DATABASE_URL is complete with password and host!**

---

## Step 5: Deploy 🚀

1. In Netlify dashboard → **Deployments**
2. Click **Trigger deploy** → **Deploy site**
3. Wait 2-3 minutes for build to complete
4. Check build logs if any issues

---

## Step 6: Test Your Application ✅

1. Open your Netlify site URL
2. You should see the application load without login
3. Demo data should be visible
4. Try:
   - Navigate to different sections
   - Add a new company in "Struktura"
   - Create test data

---

## Troubleshooting 🛠️

### Build Failed
- Check all environment variables are set
- Click **Trigger deploy** again
- Check build logs for specific errors

### Database Connection Error
- Verify `DATABASE_URL` is correct from Railway
- Test connection: `mysql://user:password@host:3306/database`
- Make sure Railway MySQL is running (green status)

### Page Loads but No Data
- Wait 30-60 seconds (database seeding runs on first start)
- Hard refresh browser (Ctrl+F5 or Cmd+Shift+R)
- Check Netlify Functions logs for errors

### API Endpoints Not Responding
- Check `/api/*` routing in `netlify.toml`
- Verify environment variables are loaded (check Netlify function logs)
- Database connection must be successful

---

## What's Included 📦

- ✅ React + TypeScript frontend (Vite)
- ✅ Hono backend API
- ✅ Drizzle ORM with MySQL
- ✅ Authentication (session-based)
- ✅ Demo mode (no login required)
- ✅ Full ERP features for turkey production

---

## Security Notes 🔒

1. **Never commit `.env.production` to git**
2. **Use unique secrets for each deployment**
3. **Rotate secrets every 90 days**
4. **Enable 2FA on Netlify and Railway accounts**
5. **Use strong database passwords**

---

## Next Steps 📋

1. **Custom Domain:** Add in Netlify → Domain settings
2. **SSL Certificate:** Automatically included with Netlify
3. **CDN:** Enabled by default
4. **Monitoring:** Set up alerts in Netlify
5. **Backups:** Configure daily database backups on Railway

---

## Support & Documentation

- 📖 [Bloody Turkey README](./README.md)
- 🚂 [Railway Docs](https://docs.railway.app)
- 🌐 [Netlify Docs](https://docs.netlify.com)
- 🦆 [MySQL Docs](https://dev.mysql.com/doc)

---

**🎉 You're live!** Your application is now running in production.
