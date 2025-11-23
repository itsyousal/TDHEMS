# The Dough House - Enterprise Management System

A modern, secure, scalable internal enterprise management webapp for The Dough House bakery chain. Built with Next.js, TypeScript, Tailwind CSS, and Supabase.

##  Overview

The Dough House is a comprehensive enterprise management system designed to streamline operations across orders, production, inventory, warehouse, HR, marketing, CRM, finance, and compliance.

##  Architecture

**Frontend**: Next.js 16, TypeScript, React 19, Tailwind CSS 4, shadcn/ui
**Backend**: Netlify Functions, Supabase Edge Functions, NextAuth
**Database**: PostgreSQL via Supabase, Prisma 7 ORM, Row-Level Security
**Infrastructure**: Netlify hosting, Supabase PostgreSQL & Edge Functions

##  Quick Start

\\\ash
npm install
cp .env.example .env.local
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:seed
npm run dev
\\\

Access at http://localhost:3000

**Demo Login**: admin@doughhouse.local / password123

##  Project Structure

- **src/app**: Next.js App Router pages and API routes
- **src/components**: Reusable React components (layout, molecules, atoms)
- **src/lib**: Utility libraries (auth, db, rbac, audit, validation)
- **prisma**: Database schema and migrations
- **supabase**: Edge Functions and RLS policies

##  RBAC System

15 predefined roles with org/location-scoped access and 19-module permission matrix.

##  API Endpoints

POST /api/auth/login, GET/POST /api/orders, GET/POST /api/batches, GET/PATCH /api/inventory, and 15+ more endpoints.

See API_DOCUMENTATION.md for complete reference.

##  Design System

Tailwind CSS 4 with dough-brown primary (#8B4513), gold-accent secondary (#FFD700), and semantic colors.

##  Deployment

Deploy to Netlify with environment variables set. See DEPLOYMENT.md for detailed instructions.

##  Configuration

Create .env.local with database, Supabase, and NextAuth credentials. See .env.example for template.

##  Support

See DEPLOYMENT.md and API_DOCUMENTATION.md for documentation.

---

**Version**: 1.0.0-alpha | **Status**: In Development
