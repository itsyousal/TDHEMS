# Pre-deployment verification script for Netlify (Windows PowerShell)
# Usage: powershell -ExecutionPolicy Bypass -File scripts/pre-deploy-check.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Dough House - Pre-Deployment Checklist" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Helper functions
function Write-Success($message) {
    Write-Host "✓ $message" -ForegroundColor Green
}

function Write-Error($message) {
    Write-Host "✗ $message" -ForegroundColor Red
}

function Write-Warning($message) {
    Write-Host "⚠ $message" -ForegroundColor Yellow
}

# 1. Check Node version
Write-Host "1. Checking Node.js version..." -ForegroundColor Cyan
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..+', '$1')
    if ($majorVersion -ge 18) {
        Write-Success "Node.js $nodeVersion (required: 18+)"
    } else {
        Write-Error "Node.js $nodeVersion (required: 18+)"
    }
} else {
    Write-Error "Node.js not installed"
}
Write-Host ""

# 2. Check npm
Write-Host "2. Checking npm..." -ForegroundColor Cyan
if (Get-Command npm -ErrorAction SilentlyContinue) {
    $npmVersion = npm --version
    Write-Success "npm $npmVersion installed"
} else {
    Write-Error "npm not installed"
}
Write-Host ""

# 3. Check Git
Write-Host "3. Checking Git repository..." -ForegroundColor Cyan
if (Test-Path ".git") {
    Write-Success "Git repository initialized"
    
    # Check remote
    $remote = git config --get remote.origin.url
    if ($remote) {
        Write-Success "Git remote configured: $remote"
    } else {
        Write-Error "Git remote not configured"
    }
    
    # Check branch
    $branch = git rev-parse --abbrev-ref HEAD
    Write-Success "Current branch: $branch"
    
    # Check uncommitted changes
    $status = git status --porcelain
    if ($status) {
        Write-Warning "You have uncommitted changes - remember to commit and push before deploying"
        Write-Host $status -ForegroundColor Yellow
    } else {
        Write-Success "No uncommitted changes"
    }
} else {
    Write-Error "Not a Git repository"
}
Write-Host ""

# 4. Check required files
Write-Host "4. Checking project structure..." -ForegroundColor Cyan
$requiredFiles = @(
    ".env",
    ".env.example",
    "package.json",
    "netlify.toml",
    "next.config.ts",
    "tsconfig.json",
    "prisma/schema.prisma"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Success "Found: $file"
    } else {
        Write-Error "Missing: $file"
    }
}
Write-Host ""

# 5. Check environment variables
Write-Host "5. Checking environment variables..." -ForegroundColor Cyan
$requiredVars = @(
    "DATABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_KEY",
    "NEXTAUTH_SECRET",
    "ENCRYPTION_KEY"
)

if (Test-Path ".env") {
    # Load .env file
    Get-Content ".env" | ForEach-Object {
        $line = $_
        if ($line -match '^([^=]+)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
        }
    }
    
    foreach ($var in $requiredVars) {
        $value = [System.Environment]::GetEnvironmentVariable($var)
        if ([string]::IsNullOrEmpty($value)) {
            Write-Error "$var not set"
        } else {
            # Show first 20 chars and ...
            if ($value.Length -gt 20) {
                Write-Success "$var is set ($($value.Substring(0, 20))...)"
            } else {
                Write-Success "$var is set"
            }
        }
    }
} else {
    Write-Error ".env file not found"
}
Write-Host ""

# 6. Check dependencies
Write-Host "6. Checking npm dependencies..." -ForegroundColor Cyan
try {
    $output = npm list 2>&1
    Write-Success "All npm dependencies installed"
} catch {
    Write-Warning "Some npm dependencies may be missing - run 'npm install'"
}
Write-Host ""

# 7. Build check
Write-Host "7. Checking build..." -ForegroundColor Cyan
Write-Host "Running: npm run build"
$buildOutput = npm run build 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "Build succeeds"
} else {
    Write-Error "Build failed - see errors above"
    Write-Host $buildOutput -ForegroundColor Red
}
Write-Host ""

# 8. Lint check
Write-Host "8. Checking linting..." -ForegroundColor Cyan
Write-Host "Running: npm run lint"
$lintOutput = npm run lint 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "No linting errors"
} else {
    Write-Warning "Linting warnings/errors found - please review"
}
Write-Host ""

# 9. Type check
Write-Host "9. Checking TypeScript..." -ForegroundColor Cyan
Write-Host "Running: npm run type-check"
$typeOutput = npm run type-check 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "No TypeScript errors"
} else {
    Write-Error "TypeScript errors found"
}
Write-Host ""

# 10. .gitignore check
Write-Host "10. Checking .gitignore..." -ForegroundColor Cyan
if (Test-Path ".gitignore") {
    $gitignore = Get-Content ".gitignore" -Raw
    if ($gitignore -match "^\.env$") {
        Write-Success ".env is ignored"
    } else {
        Write-Warning ".env might not be ignored properly"
    }
    if ($gitignore -match "^node_modules") {
        Write-Success "node_modules is ignored"
    } else {
        Write-Warning "node_modules might not be ignored properly"
    }
} else {
    Write-Error ".gitignore not found"
}
Write-Host ""

# Final summary
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Pre-Deployment Checklist Complete!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Commit any changes: git add . && git commit -m 'Ready for deployment'"
Write-Host "2. Push to GitHub: git push origin main"
Write-Host "3. Go to https://app.netlify.com"
Write-Host "4. Connect your GitHub repository"
Write-Host "5. Set environment variables in Netlify UI"
Write-Host "6. Deploy!"
Write-Host ""
Write-Host "See NETLIFY_DEPLOYMENT.md for detailed instructions." -ForegroundColor Gray
