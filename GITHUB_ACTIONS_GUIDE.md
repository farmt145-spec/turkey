# GitHub Actions - Continuous Integration & Deployment

## Overview

This project includes automated workflows for:
- **Testing** - Runs on every PR and push
- **Building** - Validates production builds
- **Deployment** - Automatic deployment to Netlify on main branch merge

---

## Workflows Included

### 1. Test Workflow (`.github/workflows/test.yml`)

**Triggers:** Pull requests, pushes to main/develop

**What it does:**
- Runs tests on Node 18 and 20
- Executes linter checks
- Generates coverage reports
- Uploads to Codecov

**Status badge:**
```markdown
![Tests](https://github.com/farmt145-spec/turkey/actions/workflows/test.yml/badge.svg)
```

---

### 2. Deploy Workflow (`.github/workflows/deploy.yml`)

**Triggers:** Pushes to main branch

**What it does:**
- Installs dependencies
- Runs linter (non-blocking)
- Type checks with TypeScript
- Builds production bundle
- Runs tests

**Process:**
1. Code pushed to main
2. GitHub Actions builds the application
3. If build succeeds, Netlify automatically deploys
4. Live within 2-3 minutes

---

## How to Use

### Local Development

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
npm run dev

# Test locally
npm test
npm run lint
npm run check

# Commit and push
git push origin feature/my-feature
```

### Create Pull Request

1. Go to GitHub repository
2. Click "Compare & pull request"
3. Add description of changes
4. Click "Create pull request"
5. Wait for tests to pass (green checkmark)
6. Merge when ready

### Deployment to Production

1. Tests must pass
2. PR must be reviewed and approved
3. Merge to `main` branch
4. GitHub Actions automatically deploys
5. Monitor deployment in Netlify dashboard

---

## Monitoring Builds

### GitHub Actions Dashboard

1. Go to repository → **Actions** tab
2. Click on a workflow run
3. View:
   - Build logs
   - Test results
   - Coverage reports
   - Step-by-step execution

### Netlify Dashboard

1. Go to [app.netlify.com](https://app.netlify.com)
2. Select your site
3. **Deployments** tab shows:
   - Deployment status
   - Build time
   - Logs
   - Rollback options

---

## Environment Variables in CI/CD

### GitHub Secrets

Add secrets for sensitive data:

1. Repository Settings → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add secrets (if needed for future workflows)

### Netlify Deployment Context

Netlify automatically uses:
- `main` branch → Production environment
- Other branches → Preview deployments

Environment variables from Netlify UI are used for all deployments.

---

## Common Issues

### Build Failed on GitHub Actions

**Check:**
- Node version compatibility
- Dependencies installed correctly
- Type errors in TypeScript

**Fix:**
```bash
cd app
npm ci --legacy-peer-deps
npm run check
npm run build
```

### Tests Failing

**Debug locally:**
```bash
cd app
npm test -- --run
```

**Update snapshots if needed:**
```bash
npm test -- --update
```

### Netlify Deploy Failing

- Check environment variables
- Review Netlify Function logs
- Verify database connection
- Check build logs in Netlify dashboard

---

## Best Practices

1. **Always work on feature branches**
   ```bash
   git checkout -b feature/description
   ```

2. **Keep commits atomic**
   - One logical change per commit
   - Clear commit messages

3. **Run tests before pushing**
   ```bash
   npm test -- --run
   npm run lint
   ```

4. **Keep dependencies updated**
   - Regular `npm audit fix`
   - Review major updates

5. **Document changes**
   - Update README if needed
   - Add comments for complex code

---

## Deployment Checklist

Before merging to main:

- [ ] All tests pass locally
- [ ] No linter warnings
- [ ] No TypeScript errors
- [ ] Tested in dev mode
- [ ] Branch is up to date with main
- [ ] PR description is clear
- [ ] Code reviewed by team member

---

## Quick Commands

```bash
# Run all checks
cd app
npm run lint && npm run check && npm test -- --run && npm run build

# Deploy checklist script
bash scripts/deploy-checklist.sh

# Generate production secrets
node scripts/generate-secrets.js
```

---

## Resources

- 📚 [GitHub Actions Docs](https://docs.github.com/en/actions)
- 🚂 [Railway Documentation](https://docs.railway.app)
- 🌐 [Netlify Documentation](https://docs.netlify.com)
- 📖 [Node.js Best Practices](https://nodejs.org/en/docs/guides/nodejs-best-practices)
