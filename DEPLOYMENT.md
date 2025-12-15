# The Dough House - Deployment Guide

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Supabase Setup](#supabase-setup)
3. [Netlify Deployment](#netlify-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Database Migrations](#database-migrations)
6. [Edge Functions Deployment](#edge-functions-deployment)
7. [Monitoring & Logs](#monitoring--logs)
8. [Troubleshooting](#troubleshooting)

## Local Development Setup

### Prerequisites

- Node.js 20.0+
- PostgreSQL 14+ or Supabase account
- Git
- GitHub account (for CI/CD)

### Step 1: Clone and Install

```bash
git clone <your-repo-url>
cd dough-house

npm install
```

### Step 2: Environment Configuration

```bash
# Create local environment file
cp .env.example .env.local

# Edit .env.local with local database details
# For local Postgres:
DATABASE_URL="postgresql://user:password@localhost:5432/dough_house_db"

# For Supabase (recommended):
DATABASE_URL="postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[project-id].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[anon-key]"
SUPABASE_SERVICE_KEY="[service-role-key]"
```

### Step 3: Initialize Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Create tables
npm run prisma:migrate:dev

# Seed roles and permissions
npm run prisma:seed
```

### Step 4: Start Development Server

```bash
npm run dev
```

Access at http://localhost:3000

## Supabase Setup

### Create Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Enter project name: "dough-house"
4. Choose region closest to users
5. Set database password (save securely)
6. Wait for project to initialize (5-10 minutes)

### Get Connection Details

1. Navigate to Project Settings → Database
2. Copy connection string (PostgreSQL)
3. Update DATABASE_URL in .env
4. Get API keys from Settings → API

### Enable RLS

1. Go to SQL Editor
2. Run the script from `supabase/rls-policies.sql`
3. Verify all tables have RLS enabled

## Netlify Deployment

### Step 1: Connect Repository

1. Push code to GitHub
2. Go to https://app.netlify.com
3. Click "New site from Git"
4. Select GitHub repository
5. Authorize Netlify access

### Step 2: Build Configuration

Netlify should auto-detect configuration from `netlify.toml`:

- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Functions directory**: `.netlify/functions-internal` (managed by Netlify's Next.js runtime)

### Step 3: Set Environment Variables

In Netlify UI (Site Settings → Build & Deploy → Environment):

```
NODE_VERSION=20
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://your-domain.netlify.app
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
ENCRYPTION_KEY=<generate with: openssl rand -hex 32>
```

### Step 4: Deploy

```bash
# Push to main branch
git push origin main

# Netlify automatically deploys
# Monitor build in Netlify UI
```

## Environment Configuration

### Development (.env.local)

```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_KEY="..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
ENCRYPTION_KEY="..."
LOG_LEVEL="debug"
ENABLE_RULE_ENGINE=true
```

### Staging (.env.staging)

```bash
DATABASE_URL="postgresql://user:pass@supabase-staging.co/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://staging.supabase.co"
# Other production-like config
LOG_LEVEL="info"
```

### Production (.env.production)

```bash
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://prod.supabase.co"
NEXTAUTH_URL="https://your-domain.com"
LOG_LEVEL="warn"
SENTRY_DSN="https://..."

## Troubleshooting

### Netlify functions return 500: "Can't reach database server"

Some Supabase `db.<project-ref>.supabase.co` hostnames are IPv6-only (AAAA record only). Netlify Functions commonly run in environments without IPv6 egress, which results in Prisma errors like:

"Can't reach database server at `db.<ref>.supabase.co:5432`"

Fix:

- Use the Supabase connection pooler hostname (it resolves to IPv4) for `DATABASE_URL` (often port `6543`).
- Keep the direct connection string for migrations/maintenance in `DIRECT_URL`.
- Ensure the URL includes `sslmode=require`.

Get the exact pooler URL from Supabase: Project Settings → Database → Connection string → Pooler (Transaction/Session).
```

## Database Migrations

### Development

```bash
# Create new migration
npm run prisma:migrate:dev -- --name add_new_table

# Review generated migration in prisma/migrations/
# Adjust if needed, then run automatically
```

### Production

```bash
# Before deploying, run:
npm run prisma:migrate:deploy

# Verify schema:
npm run prisma:validate
```

### Rollback

```bash
# Prisma doesn't support automatic rollbacks
# Manual steps:
# 1. Revert code changes
# 2. Create inverse migration
# 3. Test locally first
npm run prisma:migrate:dev -- --name revert_previous_migration
```

## Edge Functions Deployment

### Prerequisites

- Supabase CLI installed: `npm install -g supabase`
- Authenticated with Supabase: `supabase login`

### Deploy Rule Engine Function

```bash
# From project root
cd supabase/functions/rule-engine

# Deploy to Supabase
supabase functions deploy rule-engine

# Verify deployment
supabase functions list
```

### Deploy Order Ingestion Function

```bash
supabase functions deploy order-ingestion
```

### View Logs

```bash
supabase functions logs rule-engine --tail

# Or via Supabase UI: Functions → rule-engine → Logs
```

## Monitoring & Logs

### Application Logs

Supabase provides logs via:
1. Project Dashboard → Logs
2. Supabase CLI: `supabase logs --tail`

### Error Tracking with Sentry

1. Create Sentry account
2. Create project (Node.js)
3. Get DSN
4. Set in environment: `SENTRY_DSN=https://...`
5. View issues in Sentry dashboard

### Database Monitoring

```bash
# Via Supabase UI
# Dashboard → Database → Query Performance

# Or check active connections:
supabase db inspect
```

### Performance Monitoring

```bash
# Check Netlify analytics
# Site Overview → Analytics

# Check Supabase metrics
# Project Settings → Statistics
```

## Troubleshooting

### Build Fails on Netlify

**Error**: "Cannot find module @prisma/client"

**Solution**:
```bash
# Ensure prisma is installed
npm install --save-dev prisma

# Generate client
npm run prisma:generate

# Add to .gitignore: !prisma/.env
```

**Error**: "DATABASE_URL is not set"

**Solution**: Verify environment variable in Netlify UI

### Database Connection Issues

**Error**: "Cannot connect to database"

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Verify URL format: postgresql://user:pass@host:port/db
# Ensure IP is whitelisted (Supabase: Project Settings → Database → Add IP)
```

### RLS Policies Blocking Writes

**Error**: "new row violates row-level security policy"

**Solution**:
```bash
# Check user's org/location context
# Verify RLS policies in supabase/rls-policies.sql

# Temporarily disable for testing:
ALTER TABLE "Order" DISABLE ROW LEVEL SECURITY;

# Re-enable when fixed:
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
```

### Prisma Client Out of Sync

**Error**: "Prisma schema out of sync"

```bash
npm run prisma:generate
npm run prisma:validate
```

## Continuous Integration

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Netlify

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
      
      - run: npm install
      - run: npm run lint
      - run: npm run build
      - run: npm run prisma:validate
      
      - uses: netlify/actions/cli@master
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
        with:
          args: deploy --prod
```

## Backup & Recovery

### Database Backup

```bash
# Supabase handles automated daily backups
# Access from: Project Settings → Backups

# Manual backup:
pg_dump $DATABASE_URL > backup.sql

# Restore:
psql $DATABASE_URL < backup.sql
```

### Code Backup

Automatically handled by GitHub.

## Custom Domain

1. In Netlify: Site Settings → Domain Management
2. Add custom domain
3. Update DNS (instructions provided by Netlify)
4. Wait for SSL certificate (automated)

## Performance Optimization

### Next.js Build

```bash
# Analyze bundle
npm run build -- --analyze

# Output-standalone for Docker:
STANDALONE=true npm run build
```

### Database Optimization

```bash
# Add indexes (already in schema)
# Monitor query performance in Supabase

# Check slow queries:
SELECT * FROM "public"."pg_stat_statements"
ORDER BY mean_time DESC;
```

### Caching

- Next.js ISR (Incremental Static Regeneration) configured
- Netlify edge caching for static assets
- Database query caching at application level

## Support & Resources

- Netlify Docs: https://docs.netlify.com
- Supabase Docs: https://supabase.io/docs
- Next.js Docs: https://nextjs.org/docs
- GitHub Issues: Document any deployment issues
