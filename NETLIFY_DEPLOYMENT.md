# Netlify Deployment Guide for The Dough House

## Prerequisites

- GitHub account with the repository pushed
- Netlify account (free tier available at https://app.netlify.com)
- Node.js 20+ installed locally

## Step 1: Prepare Your Repository

### 1.1 Commit Your Changes

```bash
cd d:\Kenken\dough-house

# Check git status
git status

# Stage all changes
git add .

# Commit with a meaningful message
git commit -m "Add access management and user permission features"

# Push to GitHub
git push origin main
```

### 1.2 Verify .env Files

Create a `.env.example` file (already exists) that shows all required environment variables WITHOUT secrets:

```bash
# This file should be in your repository
cat .env.example
```

## Step 2: Connect to Netlify

### 2.1 Via Netlify UI (Recommended)

1. **Go to Netlify Dashboard**
   - Visit https://app.netlify.com
   - Click "Add new site" → "Import an existing project"

2. **Connect GitHub**
   - Click "GitHub" 
   - Authorize Netlify to access your repositories
   - Select "dough-house" repository

3. **Configure Build Settings**
   - **Build Command**: `npm run build`
   - **Publish Directory**: `.next`
   - **Node Version**: `20` (set in Build image setting or netlify.toml)

4. **Set Environment Variables**
   - Click "Show Advanced" → "New variable"
   - Add ALL variables from your `.env` file:

```
DATABASE_URL = your_value
NEXT_PUBLIC_SUPABASE_URL = your_value
NEXT_PUBLIC_SUPABASE_ANON_KEY = your_value
SUPABASE_SERVICE_KEY = your_value
NEXTAUTH_SECRET = your_value
NEXTAUTH_URL = your_production_url (e.g., https://dough-house.netlify.app)
ENCRYPTION_KEY = your_value
ENABLE_RULE_ENGINE = true
ENABLE_EDGE_FUNCTIONS = true
ENABLE_REAL_TIME_WAREHOUSE = false
```

5. **Deploy**
   - Click "Deploy site"
   - Wait for build to complete (3-5 minutes)

### 2.2 Via Netlify CLI

```bash
# Install Netlify CLI globally (if not already installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize the site (in project directory)
netlify init

# This will prompt you to:
# 1. Connect to GitHub
# 2. Select the repository
# 3. Set build settings
# 4. Set environment variables

# Deploy
netlify deploy --prod
```

## Step 3: Configure Production Environment

### 3.1 Update NEXTAUTH_URL

Once your Netlify site is deployed, update the `NEXTAUTH_URL` environment variable:

1. Go to your site settings in Netlify
2. Click "Site Settings" → "Build & Deploy" → "Environment"
3. Edit `NEXTAUTH_URL` and set it to your production URL:
   ```
   NEXTAUTH_URL = https://your-site-name.netlify.app
   ```

### 3.2 Database Connection

Ensure your Supabase database is accessible from Netlify:
- Add Netlify IP addresses to Supabase firewall (if applicable)
- Or ensure the database allows all IPs (not recommended for production)

## Step 4: Post-Deployment Tasks

### 4.1 Run Database Migrations

After first deployment, run Prisma migrations in production:

```bash
# This will be handled automatically if you have
# "prisma:migrate:deploy" in your build or postbuild scripts
```

Or manually via Netlify Functions/Console:
```bash
npx prisma migrate deploy
```

### 4.2 Verify Deployment

1. **Check Build Logs**
   - Go to site settings → "Builds"
   - Click the latest deploy
   - Review logs for any errors

2. **Test Authentication**
   - Visit your deployed site
   - Try logging in with test credentials:
     - Email: test@doughhouse.com
     - Password: Test@12345

3. **Test Key Features**
   - Access Management page
   - Password Management
   - Finance Dashboard
   - Other protected pages

### 4.3 Enable Netlify Functions (Optional)

If you want to use Netlify Edge Functions or serverless functions:

1. Create `netlify/functions/` directory
2. Migrate any API routes if needed
3. Update `netlify.toml` configuration

## Troubleshooting

### Build Fails with "Failed to compile"

1. Check build logs in Netlify
2. Ensure all environment variables are set correctly
3. Run `npm run build` locally to replicate the issue
4. Common causes:
   - Missing environment variables
   - TypeScript errors
   - Missing dependencies

### "Cannot find module" Error

```bash
# Run locally to verify
npm install
npm run build

# If it works locally, try:
# 1. Clear Netlify cache and rebuild
# 2. Verify node_modules aren't in .gitignore
# 3. Check Node version matches (20.x)
```

### Database Connection Errors

1. Verify `DATABASE_URL` is correct and accessible
2. Test connection locally:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```
3. Check Supabase is accepting connections from Netlify's IP

### Authentication Not Working

1. Verify `NEXTAUTH_URL` matches your deployment URL exactly
2. Check `NEXTAUTH_SECRET` is set and same across environments
3. Review NextAuth.js logs in browser console

## Continuous Deployment

Netlify automatically deploys when you push to GitHub:

1. **Main Branch** → Production
   - Any push to `main` triggers a production deploy
   - Takes ~3-5 minutes

2. **Other Branches** → Preview Deploys
   - Pull requests get automatic preview URLs
   - Great for testing before merging

## Performance Optimization

### Recommended Settings

In `netlify.toml`:
```toml
[build]
  # Use Next.js 12+ to get automatic Image Optimization
  command = "npm run build"
  
[functions]
  # Node version for serverless functions
  node_bundler = "esbuild"
```

### Monitor Performance

1. Go to "Analytics" tab in Netlify
2. Check "Functions" for API performance
3. Check "Builds" for build times

## Rolling Back

If deployment has issues:

1. Go to "Deploys" in Netlify
2. Find a previous successful deploy
3. Click "..." → "Publish Deploy"

## Useful Netlify Commands

```bash
# Check site status
netlify status

# View site info
netlify sites:list

# Open site in browser
netlify open

# View function logs
netlify functions:invoke [function-name]

# Debug local build
netlify build

# Local dev server (simulates Netlify)
netlify dev
```

## Security Checklist

- [ ] All secrets are in Netlify environment variables (not in .env.example)
- [ ] `NEXTAUTH_SECRET` is a strong, random string
- [ ] Database credentials are not exposed in code
- [ ] API keys are encrypted and rotated regularly
- [ ] Git repository is private
- [ ] Netlify site has password protection (optional for staging)

## Next Steps

After successful deployment:

1. **Set up custom domain** (optional)
   - Go to "Domain management"
   - Add your custom domain
   - Configure DNS records

2. **Enable HTTPS** (automatic with Netlify)
   - SSL certificate provisioned automatically
   - Renews automatically

3. **Monitor uptime** (optional)
   - Use Netlify or third-party monitoring
   - Set up alerts for failures

4. **Set up CI/CD pipeline** (advanced)
   - Run tests on every push
   - Auto-deploy on test pass
   - Set up staging/production environments

## Support

For Netlify-specific issues:
- Netlify Docs: https://docs.netlify.com
- Netlify Support: https://netlify.com/support
- Community Forum: https://community.netlify.com

For Next.js issues:
- Next.js Docs: https://nextjs.org/docs
- Next.js on Netlify: https://docs.netlify.com/integrations/frameworks/next-js/overview/
