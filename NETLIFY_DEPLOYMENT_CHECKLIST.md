# Netlify Deployment Checklist

## Pre-Deployment Steps

### Code Preparation
- [ ] All changes committed to git
- [ ] `.gitignore` includes sensitive files (.env, node_modules, .next, etc.)
- [ ] `.env.example` created with non-secret template
- [ ] No hardcoded secrets in code
- [ ] No console.log debugging left in production code

### Build Verification
- [ ] `npm run build` succeeds locally
- [ ] `npm run lint` passes (no errors)
- [ ] `npm run type-check` passes (no TypeScript errors)
- [ ] All dependencies installed: `npm install`

### GitHub Setup
- [ ] Repository is public (if needed for Netlify)
- [ ] Latest code pushed to main branch
- [ ] GitHub repository URL: `https://github.com/[your-username]/[repo-name]`

## Deployment Steps

### Connect to Netlify
- [ ] Log in to https://app.netlify.com
- [ ] Click "Add new site" → "Import an existing project"
- [ ] Select GitHub and authorize if needed
- [ ] Choose your "dough-house" repository
- [ ] Select branch to deploy: `main`

### Configure Build
- [ ] Build command: `npm run build`
- [ ] Publish directory: `.next`
- [ ] Node.js version: `20.x`
- [ ] Click "Show Advanced" for additional settings if needed

### Set Environment Variables

Click "Show Advanced" → "New variable" and add:

| Variable | Value | Source |
|----------|-------|--------|
| `DATABASE_URL` | Your PostgreSQL connection | `.env` |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | `.env` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase Anon Key | `.env` |
| `SUPABASE_SERVICE_KEY` | Your Supabase Service Key | `.env` |
| `NEXTAUTH_SECRET` | Your NextAuth Secret | `.env` |
| `NEXTAUTH_URL` | `https://[your-site].netlify.app` | Netlify auto-generated URL |
| `ENCRYPTION_KEY` | Your Encryption Key | `.env` |
| `ENABLE_RULE_ENGINE` | `true` | `.env` |
| `ENABLE_EDGE_FUNCTIONS` | `true` | `.env` |
| `ENABLE_REAL_TIME_WAREHOUSE` | `false` | `.env` |

### Deploy
- [ ] Click "Deploy site"
- [ ] Wait for build to complete (3-5 minutes)
- [ ] Check build logs for any errors
- [ ] Verify deployment succeeded (shows "Published" status)

## Post-Deployment Verification

### Access and Login
- [ ] Site is accessible at generated URL
- [ ] Can navigate to login page without errors
- [ ] Can log in with test user:
  - Email: `test@doughhouse.com`
  - Password: `Test@12345`

### Key Features
- [ ] Dashboard loads properly
- [ ] Can access People → Access Management
- [ ] Can access People → Password Management
- [ ] Finance page loads (or shows proper access denied)
- [ ] Database queries work (check network tab)
- [ ] Authentication/sessions work properly

### Build Environment
- [ ] Check "Deploys" tab for successful build
- [ ] Build time is reasonable (< 10 minutes)
- [ ] No warnings in build logs (only errors need fixing)
- [ ] All environment variables loaded correctly

### Security
- [ ] HTTPS is enabled (automatic)
- [ ] Security headers present (check in DevTools)
- [ ] No sensitive data in error messages
- [ ] API calls use HTTPS

## Ongoing Maintenance

### After Successful Deployment
- [ ] Configure custom domain (optional)
- [ ] Set up DNS records if using custom domain
- [ ] Enable branch deploy previews (optional)
- [ ] Set up deploy notifications (Slack, email, etc.)
- [ ] Review Netlify analytics

### Monitor Deployments
- [ ] Subscribe to build notifications
- [ ] Monitor error logs
- [ ] Check performance metrics weekly
- [ ] Review deployed functions (if using serverless)

## Troubleshooting

### If Build Fails
1. [ ] Check build logs in Netlify UI
2. [ ] Look for specific error messages
3. [ ] Run `npm run build` locally to reproduce
4. [ ] Fix errors and push to git
5. [ ] Netlify will auto-redeploy

### If Site Won't Load
1. [ ] Check if environment variables are set
2. [ ] Verify database is accessible
3. [ ] Check browser console for errors
4. [ ] Review Netlify function logs

### If Authentication Fails
1. [ ] Verify `NEXTAUTH_URL` is correct (must match deployed URL)
2. [ ] Check `NEXTAUTH_SECRET` is set
3. [ ] Ensure database connection works
4. [ ] Test with different browser/incognito

### If API Endpoints Return Errors
1. [ ] Check API error logs (look for status codes)
2. [ ] Verify database permissions
3. [ ] Ensure all environment variables are present
4. [ ] Test API endpoint with curl/Postman locally

## Quick Commands

```bash
# View Netlify site info
netlify sites:list

# Open your deployed site
netlify open

# Check deployment status
netlify status

# View build logs
netlify logs

# Deploy manually (if needed)
netlify deploy --prod

# Clear cache and redeploy
# (Go to site settings → Deploys → Trigger deploy)
```

## Support Resources

- **Netlify Docs**: https://docs.netlify.com
- **Next.js on Netlify**: https://docs.netlify.com/integrations/frameworks/next-js/
- **Supabase Docs**: https://supabase.com/docs
- **NextAuth.js Docs**: https://next-auth.js.org

## Notes

- Builds are triggered automatically when you push to GitHub
- Preview deploys are created for pull requests
- Deployment takes 3-5 minutes typically
- You can trigger manual redeploys from Netlify UI
- All commits to main branch will deploy to production

---

**Status**: [ ] Ready to Deploy | [ ] Deployed | [ ] Issues Found

**Deployment Date**: _______________

**Deployed URL**: _______________

**Issues/Notes**: 
