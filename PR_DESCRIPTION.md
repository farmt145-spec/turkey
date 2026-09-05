# Netlify Identity and Rainway integration PR

This branch adds a minimal Netlify Identity-based unified login and a server-side proxy to securely call Rainway APIs.

Files added:
- netlify/functions/auth-proxy.ts
- app/src/lib/netlify-identity.ts
- app/src/lib/netlifyAuth.ts
- app/src/pages/Login.tsx
- app/src/pages/Callback.tsx
- NETLIFY_SETUP.md
- DEPLOYMENT_GUIDE_NETLIFY.md
- .env.netlify.example
- netlify.toml (updated contexts)

What you need to do in Netlify:
1. Enable Identity for the site (Site → Settings → Identity). Configure providers (email, GitHub, Google) as required.
2. In Site → Settings → Build & deploy → Environment, add values for RAINWAY_API_BASE and RAINWAY_API_KEY for production and demo contexts.
3. (Optional) Set NETLIFY_JWT_SECRET if you want the proxy to verify HS256 JWTs. If not set, the proxy will skip verification but will still use Identity endpoints to validate.
4. Deploy the site or trigger a build.

Security:
- No secrets are stored in the repo. All secrets must be set in Netlify.

This commit is prepared on branch feature/unified-auth-netlify and ready for PR to main.
