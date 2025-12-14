@'
# Pre-deployment verification script for Netlify (Windows PowerShell)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Dough House - Pre-Deployment Checklist" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node version
Write-Host "1. Checking Node.js version..." -ForegroundColor Cyan
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Host "✓ Node.js $nodeVersion (required: 18+)" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js not installed" -ForegroundColor Red
}
Write-Host ""

# 2. Check npm
Write-Host "2. Checking npm..." -ForegroundColor Cyan
if (Get-Command npm -ErrorAction SilentlyContinue) {
    $npmVersion = npm --version
    Write-Host "✓ npm $npmVersion installed" -ForegroundColor Green
} else {
    Write-Host "✗ npm not installed" -ForegroundColor Red
}
Write-Host ""

# 3. Check Git
Write-Host "3. Checking Git repository..." -ForegroundColor Cyan
if (Test-Path ".git") {
    Write-Host "✓ Git repository initialized" -ForegroundColor Green
    $remote = git config --get remote.origin.url 2>$null
    if ($remote) {
        Write-Host "✓ Git remote configured" -ForegroundColor Green
    }
    $branch = git rev-parse --abbrev-ref HEAD 2>$null
    Write-Host "✓ Current branch: $branch" -ForegroundColor Green
} else {
    Write-Host "✗ Not a Git repository" -ForegroundColor Red
}
Write-Host ""

# 4. Check required files
Write-Host "4. Checking project structure..." -ForegroundColor Cyan
$files = @(".env", ".env.example", "package.json", "netlify.toml", "next.config.ts")
foreach ($f in $files) {
    if (Test-Path $f) {
        Write-Host "✓ Found: $f" -ForegroundColor Green
    } else {
        Write-Host "✗ Missing: $f" -ForegroundColor Red
    }
}
Write-Host ""

# 5. Check environment variables
Write-Host "5. Checking environment variables..." -ForegroundColor Cyan
if (Test-Path ".env") {
    $env_vars = Get-Content ".env" | Where-Object { $_ -match "^[A-Z]" } | Measure-Object
    if ($env_vars.Count -gt 0) {
        Write-Host "✓ Found $($env_vars.Count) environment variables" -ForegroundColor Green
    }
} else {
    Write-Host "✗ .env file not found" -ForegroundColor Red
}
Write-Host ""

# 6. Check dependencies
Write-Host "6. Checking npm dependencies..." -ForegroundColor Cyan
if (Test-Path "node_modules") {
    Write-Host "✓ npm dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠ node_modules not found - run: npm install" -ForegroundColor Yellow
}
Write-Host ""

# 7. Build check
Write-Host "7. Testing build..." -ForegroundColor Cyan
npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Build succeeds" -ForegroundColor Green
} else {
    Write-Host "✗ Build failed" -ForegroundColor Red
}
Write-Host ""

# 8. Lint check
Write-Host "8. Checking linting..." -ForegroundColor Cyan
npm run lint 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ No linting errors" -ForegroundColor Green
} else {
    Write-Host "⚠ Linting warnings/errors" -ForegroundColor Yellow
}
Write-Host ""

# 9. TypeScript check
Write-Host "9. Checking TypeScript..." -ForegroundColor Cyan
npm run type-check 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ No TypeScript errors" -ForegroundColor Green
} else {
    Write-Host "✗ TypeScript errors found" -ForegroundColor Red
}
Write-Host ""

# Final summary
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Pre-Deployment Checklist Complete" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. git add . && git commit -m 'Ready for deployment'"
Write-Host "2. git push origin main"
Write-Host "3. Go to https://app.netlify.com"
Write-Host "4. Connect your dough-house GitHub repository"
Write-Host "5. Set environment variables in Netlify UI"
Write-Host "6. Deploy"
Write-Host ""
Write-Host "See NETLIFY_DEPLOYMENT.md for detailed instructions." -ForegroundColor Gray
'@ | Out-File scripts/pre-deploy-check.ps1 -Encoding UTF8
