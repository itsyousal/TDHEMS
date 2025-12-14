#!/bin/bash
# Pre-deployment verification script for Netlify

echo "=========================================="
echo "Dough House - Pre-Deployment Checklist"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_mark="${GREEN}✓${NC}"
cross_mark="${RED}✗${NC}"
warning="${YELLOW}⚠${NC}"

# Function to print status
print_status() {
  if [ $1 -eq 0 ]; then
    echo -e "${check_mark} $2"
  else
    echo -e "${cross_mark} $2"
  fi
}

# Function to print warning
print_warning() {
  echo -e "${warning} $1"
}

# Check Node version
echo "1. Checking Node.js version..."
if command -v node &> /dev/null; then
  node_version=$(node -v)
  major_version=$(echo $node_version | cut -d'.' -f1 | sed 's/v//')
  if [ "$major_version" -ge 18 ]; then
    print_status 0 "Node.js $node_version (required: 18+)"
  else
    print_status 1 "Node.js $node_version (required: 18+)"
  fi
else
  print_status 1 "Node.js not installed"
fi
echo ""

# Check npm
echo "2. Checking npm..."
if command -v npm &> /dev/null; then
  npm_version=$(npm -v)
  print_status 0 "npm $npm_version installed"
else
  print_status 1 "npm not installed"
fi
echo ""

# Check Git
echo "3. Checking Git repository..."
if git rev-parse --git-dir > /dev/null 2>&1; then
  print_status 0 "Git repository initialized"
  
  # Check remote
  if git config --get remote.origin.url > /dev/null 2>&1; then
    remote=$(git config --get remote.origin.url)
    print_status 0 "Git remote configured: $remote"
  else
    print_status 1 "Git remote not configured"
  fi
  
  # Check branch
  current_branch=$(git rev-parse --abbrev-ref HEAD)
  print_status 0 "Current branch: $current_branch"
  
  # Check uncommitted changes
  if [ -z "$(git status --porcelain)" ]; then
    print_status 0 "No uncommitted changes"
  else
    print_warning "You have uncommitted changes - remember to commit and push before deploying"
    git status --short
  fi
else
  print_status 1 "Not a Git repository"
fi
echo ""

# Check required files
echo "4. Checking project structure..."
required_files=(
  ".env"
  ".env.example"
  "package.json"
  "netlify.toml"
  "next.config.ts"
  "tsconfig.json"
  "prisma/schema.prisma"
)

for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    print_status 0 "Found: $file"
  else
    print_status 1 "Missing: $file"
  fi
done
echo ""

# Check environment variables
echo "5. Checking environment variables..."
required_vars=(
  "DATABASE_URL"
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_KEY"
  "NEXTAUTH_SECRET"
  "ENCRYPTION_KEY"
)

# Source .env if it exists
if [ -f ".env" ]; then
  set -a
  source .env
  set +a
  
  for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
      print_status 1 "$var not set"
    else
      # Show first 20 chars and ...
      val="${!var}"
      if [ ${#val} -gt 20 ]; then
        print_status 0 "$var is set (${val:0:20}...)"
      else
        print_status 0 "$var is set"
      fi
    fi
  done
else
  print_status 1 ".env file not found"
fi
echo ""

# Check dependencies
echo "6. Checking npm dependencies..."
if npm list > /dev/null 2>&1; then
  print_status 0 "All npm dependencies installed"
else
  print_warning "Some npm dependencies may be missing - run 'npm install'"
fi
echo ""

# Build check
echo "7. Checking build..."
echo "Running: npm run build"
if npm run build > /dev/null 2>&1; then
  print_status 0 "Build succeeds"
else
  print_status 1 "Build failed - see errors above"
fi
echo ""

# Lint check
echo "8. Checking linting..."
echo "Running: npm run lint"
if npm run lint > /dev/null 2>&1; then
  print_status 0 "No linting errors"
else
  print_warning "Linting warnings/errors found - please review"
fi
echo ""

# Type check
echo "9. Checking TypeScript..."
echo "Running: npm run type-check"
if npm run type-check > /dev/null 2>&1; then
  print_status 0 "No TypeScript errors"
else
  print_status 1 "TypeScript errors found"
fi
echo ""

# .gitignore check
echo "10. Checking .gitignore..."
if [ -f ".gitignore" ]; then
  if grep -q "^\.env$" .gitignore; then
    print_status 0 ".env is ignored"
  else
    print_warning ".env might not be ignored properly"
  fi
  if grep -q "^node_modules" .gitignore; then
    print_status 0 "node_modules is ignored"
  else
    print_warning "node_modules might not be ignored properly"
  fi
else
  print_status 1 ".gitignore not found"
fi
echo ""

# Final summary
echo "=========================================="
echo "Pre-Deployment Checklist Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Commit any changes: git add . && git commit -m 'Ready for deployment'"
echo "2. Push to GitHub: git push origin main"
echo "3. Go to https://app.netlify.com"
echo "4. Connect your GitHub repository"
echo "5. Set environment variables in Netlify UI"
echo "6. Deploy!"
echo ""
echo "See NETLIFY_DEPLOYMENT.md for detailed instructions."
