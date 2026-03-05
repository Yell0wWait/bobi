# Deployment Runbook (Bobi Frontend)

## Scope
- App: `bobi-app-frontend` (Vite + React)
- Hosting: Vercel
- Branch production: `main`

## Prerequisites
- GitHub repo connected to Vercel project `bobi`
- Node.js and npm installed locally
- Vercel env vars configured in project settings

## Required Environment Variables (Vercel)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Set them in:
- Vercel -> Project `bobi` -> `Settings` -> `Environment Variables`
- Minimum scope: `Production`
- Recommended: `Production` + `Preview`

After editing env vars, run a redeploy.

## Normal Flow (Automatic Deploy)
1. Commit and push to `main`.
2. Vercel auto-builds and deploys production.
3. Check deployment status in:
Vercel -> Project `bobi` -> `Deployments`.

## Manual Deploy (Fallback)
From `bobi-app-frontend`:

```powershell
# If needed (once per machine)
npm.cmd install -g vercel

# Deploy production (interactive login)
vercel deploy --prod
```

If PATH/PowerShell blocks `vercel`, use full path:

```powershell
C:\Users\jeanb\AppData\Roaming\npm\vercel.cmd deploy --prod --yes
```

## Pre-Deploy Local Checks
From `bobi-app-frontend`:

```powershell
npm.cmd run lint
npm.cmd run build
```

Deploy only if both commands pass.

## Post-Deploy Smoke Test (2-5 min)
1. Open production URL in private window.
2. Guest login works.
3. Admin login works.
4. Catalogue pages load.
5. Create one test order and confirm it appears.
6. Confirm no runtime error mentioning missing `VITE_SUPABASE_*`.

## If Auto Deploy Stops Working
1. Vercel -> `Settings` -> `Git`
2. Confirm repo is linked.
3. Confirm `Production Branch = main`.
4. Confirm auto-deploy is enabled.
5. Trigger one manual redeploy from `Deployments`.

## Token Security (Vercel)
- Use short-lived tokens when possible (recommended: 30 days).
- Keep at most:
  - one local CLI token (`local-cli-bobi-...`)
  - one CI token (if needed)
- Revoke tokens that are:
  - exposed in chat/logs
  - old/unknown
  - never used

Revoke at:
- https://vercel.com/account/tokens

## Quick Incident Checklist
- App down after deploy:
1. Check deployment logs in Vercel.
2. Check env vars are set for Production.
3. Redeploy.
4. Roll back to previous healthy deployment if needed.

