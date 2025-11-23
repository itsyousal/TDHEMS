# Quick Start Guide - The Dough House

This guide will get you up and running with The Dough House development environment in **5 minutes**.

## ⚡ Prerequisites

- **Node.js 20+**: https://nodejs.org/
- **Git**: https://git-scm.com/
- **PostgreSQL 14+** OR **Supabase Account**: https://supabase.io (recommended)

## 🚀 5-Minute Setup

### Step 1: Install Dependencies (1 min)

```bash
cd dough-house
npm install
```

### Step 2: Configure Environment (1 min)

```bash
cp .env.example .env.local
```

**For Local PostgreSQL** (optional):
```bash
# In .env.local, set:
DATABASE_URL="postgresql://user:password@localhost:5432/dough_house_db"
```

**For Supabase** (recommended):
```bash
# In .env.local, set:
DATABASE_URL="postgresql://postgres:[password]@db.[id].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[id].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[key]"
SUPABASE_SERVICE_KEY="[key]"
```

### Step 3: Setup Database (2 min)

```bash
# Generate Prisma client
npm run prisma:generate

# Create tables
npm run prisma:migrate:dev

# Seed with roles and permissions
npm run prisma:seed
```

### Step 4: Start Development Server (1 min)

```bash
npm run dev
```

Visit http://localhost:3000

## 🔑 Demo Login

```
Email:    admin@doughhouse.local
Password: password123
```

## 📝 Important Files

| File | Purpose |
|------|---------|
| `.env.local` | Database connection and secrets |
| `src/app/(dashboard)/dashboard/page.tsx` | Main dashboard |
| `src/app/auth/login/page.tsx` | Login page |
| `src/app/api/auth/login/route.ts` | Authentication endpoint |
| `prisma/schema.prisma` | Database schema (60+ tables) |
| `src/lib/` | Core utilities (auth, rbac, audit, validation) |

## 🔧 Common Commands

```bash
npm run dev               # Start development server
npm run build             # Build for production
npm run prisma:migrate:dev      # Create/run migrations
npm run prisma:seed       # Reset and seed database
npm run lint              # Run linter
npm run type-check        # Check TypeScript types
```

## 🐛 Troubleshooting

### Error: "Cannot find module @prisma/client"

```bash
npm run prisma:generate
npm install
```

### Error: "DATABASE_URL is not set"

Make sure `.env.local` exists and has `DATABASE_URL` set.

### Error: "Prisma schema validation error"

```bash
npm run prisma:validate
```

### Port 3000 Already in Use

```bash
npm run dev -- -p 3001
```

## 📚 Next Steps

1. **Explore Dashboard**: http://localhost:3000/dashboard
2. **Read API Docs**: See `API_DOCUMENTATION.md`
3. **Review Code**: Check `src/lib/` for core logic
4. **Deploy**: See `DEPLOYMENT.md` for Netlify setup

## 🚀 Development Workflow

1. Create a feature branch
2. Make changes
3. Run tests and linter
4. Submit PR
5. Deploy to Netlify

## 🤝 Need Help?

- Check `DEPLOYMENT.md` for environment setup issues
- Review `API_DOCUMENTATION.md` for endpoint specs
- Check `SECURITY.md` for authentication/authorization details
- Contact: support@doughhouse.local

## ✅ Success Checklist

- [ ] Node.js 20+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env.local` created with DATABASE_URL
- [ ] Database created (`npm run prisma:migrate:dev`)
- [ ] Database seeded (`npm run prisma:seed`)
- [ ] Dev server running (`npm run dev`)
- [ ] Can login at http://localhost:3000
- [ ] Dashboard displays at http://localhost:3000/dashboard

---

**Version**: 1.0.0 | **Last Updated**: January 2024
