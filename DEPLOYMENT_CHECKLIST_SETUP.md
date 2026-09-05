# 🎯 Complete Deployment Checklist

## Pre-Deployment ✅

### Local Setup
- [ ] Clone repository: `git clone https://github.com/farmt145-spec/turkey.git`
- [ ] Install dependencies: `cd app && npm install --legacy-peer-deps`
- [ ] Run locally: `npm run dev`
- [ ] Verify app loads at `http://localhost:5173`

### Code Quality
- [ ] Run linter: `npm run lint`
- [ ] Fix type errors: `npm run check`
- [ ] Run tests: `npm test -- --run`
- [ ] Test production build: `npm run build`
- [ ] Verify build succeeds without errors

---

## Infrastructure Setup 🏗️

### 1. Railway Database
- [ ] Create Railway account at https://railway.app
- [ ] Create new project: `turkey-production`
- [ ] Add MySQL service
- [ ] Wait for status to show "Running"
- [ ] Copy `DATABASE_URL` from variables
- [ ] Test connection string format:
  ```
  mysql://user:password@hostname:3306/database
  ```

### 2. Generate Secrets
- [ ] Run: `node scripts/generate-secrets.js`
- [ ] Save SESSION_SECRET value
- [ ] Save API_KEY_PEPPER value
- [ ] Store in secure location (password manager)
- [ ] **Do NOT share or commit these values**

### 3. Netlify Setup
- [ ] Create Netlify account at https://app.netlify.com
- [ ] Click **Add new site** → **Import an existing project**
- [ ] Select GitHub repository: `farmt145-spec/turkey`
- [ ] Configure build settings:
  - [ ] Base directory: `app`
  - [ ] Build command: `npm install --legacy-peer-deps && npm run build`
  - [ ] Publish directory: `dist/public`
  - [ ] Functions directory: `netlify/functions`
- [ ] Save configuration

---

## Environment Variables ⚙️

### Add to Netlify Dashboard

Go to **Site configuration** → **Environment variables** → Add each:

```
[ ] DATABASE_TYPE = mysql
[ ] DATABASE_URL = [Your Railway URL]
[ ] SESSION_SECRET = [From generate-secrets.js]
[ ] API_KEY_PEPPER = [From generate-secrets.js]
[ ] NODE_ENV = production
[ ] DEMO_MODE = true
[ ] DEMO_COMPANY_ID = 1
[ ] VITE_DEMO_MODE = true
```

**Verification:**
- [ ] All 8 variables are set
- [ ] DATABASE_URL includes password
- [ ] SESSION_SECRET has 64+ characters
- [ ] API_KEY_PEPPER has 64+ characters

---

## GitHub Configuration 🔧

### Repository Settings
- [ ] Go to repository Settings → **Code and automation** → **Actions**
- [ ] Verify GitHub Actions is enabled
- [ ] Check **Workflows** tab for:
  - [ ] `test.yml` workflow exists
  - [ ] `deploy.yml` workflow exists

### Branch Protection (Optional but Recommended)
- [ ] Go to Settings → **Branches**
- [ ] Click **Add rule**
- [ ] Branch name pattern: `main`
- [ ] Check:
  - [ ] Require a pull request before merging
  - [ ] Require status checks to pass
  - [ ] Require branches to be up to date

---

## First Deployment 🚀

### Step 1: Push Code
```bash
git checkout -b setup/production-deployment
# Code should already be pushed to this branch
git push origin setup/production-deployment
```

### Step 2: Create Pull Request
- [ ] Go to GitHub → **Pull requests**
- [ ] Click **New pull request**
- [ ] Compare `setup/production-deployment` → `main`
- [ ] Add description: "Production deployment setup"
- [ ] Create PR

### Step 3: Review & Merge
- [ ] Review changes
- [ ] Verify GitHub Actions tests pass
- [ ] Merge pull request to main
- [ ] Watch GitHub Actions deploy workflow

### Step 4: Monitor Deployment
- [ ] Check Netlify **Deployments** tab
- [ ] Wait for build to complete (2-3 minutes)
- [ ] Build status should show "Published"
- [ ] Note your Netlify URL

---

## Post-Deployment Testing ✨

### Functional Testing
- [ ] Open your Netlify site URL
- [ ] Page loads without errors
- [ ] No JavaScript console errors
- [ ] Demo data is visible
- [ ] Navigation between sections works
- [ ] Try adding new company in "Struktura"
- [ ] Verify data persists on page reload

### API Testing
- [ ] Open browser DevTools (F12)
- [ ] Go to Network tab
- [ ] Click around app
- [ ] Verify `/api/*` requests succeed (200 status)
- [ ] Check Response times are reasonable (<1s)

### Database Verification
- [ ] Add sample data through UI
- [ ] Refresh page
- [ ] Data should persist
- [ ] No connection timeout errors

---

## Monitoring Setup 📊

### Netlify Monitoring
- [ ] Go to Netlify site → **Integrations**
- [ ] Set up alerts:
  - [ ] Failed deployments
  - [ ] Build times > 5 minutes

### Database Monitoring (Railway)
- [ ] Go to Railway project → MySQL service
- [ ] Check status regularly
- [ ] Monitor CPU/Memory usage
- [ ] Set up connection alerts if available

### Application Monitoring (Optional)
- [ ] Consider adding Sentry for error tracking
- [ ] Set up analytics (Google Analytics)
- [ ] Monitor API response times

---

## Documentation Update 📝

- [ ] Update README.md with:
  - [ ] Production URL
  - [ ] Database provider (Railway)
  - [ ] Hosting provider (Netlify)
  - [ ] Deployment date

- [ ] Document for team:
  - [ ] How to access production
  - [ ] How to rollback if needed
  - [ ] Who has access to what
  - [ ] Support/emergency contact

---

## Security Review 🔒

- [ ] Secrets are NOT in code/git
- [ ] Only Netlify UI has access to secrets
- [ ] .env files are in .gitignore
- [ ] No credentials in logs
- [ ] HTTPS enabled (automatic with Netlify)
- [ ] DATABASE_URL has strong password
- [ ] Consider 2FA on all accounts:
  - [ ] GitHub
  - [ ] Netlify
  - [ ] Railway

---

## Rollback Plan 🔄

If deployment has issues:

1. **Quick Rollback** (Netlify):
   ```
   Deployments → Find previous successful deploy → Click Deploy
   ```

2. **Code Rollback** (GitHub):
   ```bash
   git revert [commit-hash]
   git push origin main
   ```

3. **Database Issues**:
   - [ ] Contact Railway support
   - [ ] Have DATABASE_URL backup
   - [ ] Consider daily backups

---

## Success Criteria ✅

- [ ] Application loads in browser
- [ ] No console errors
- [ ] Database connection working
- [ ] Demo data displays
- [ ] Can create new data
- [ ] Data persists on reload
- [ ] API responds to requests
- [ ] Build logs show no errors

---

## Post-Launch (Week 1) 📋

- [ ] Monitor error logs daily
- [ ] Check deployment frequency
- [ ] Verify backups running
- [ ] Get user feedback
- [ ] Document any issues
- [ ] Plan improvements
- [ ] Schedule team training if needed

---

## Resources

- 📖 [Bloody Turkey README](./README.md)
- 🚀 [Production Setup Guide](./PRODUCTION_SETUP.md)
- ⚙️ [GitHub Actions Guide](./GITHUB_ACTIONS_GUIDE.md)
- 🚂 [Railway Docs](https://docs.railway.app)
- 🌐 [Netlify Docs](https://docs.netlify.com)

---

**Date Started:** _______________  
**Date Completed:** _______________  
**Deployed By:** _______________  
**Notes:** _______________________________________________
