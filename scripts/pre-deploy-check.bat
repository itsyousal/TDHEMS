@echo off
REM Pre-deployment validation script for Netlify

echo.
echo ==========================================
echo Dough House - Pre-Deployment Checklist
echo ==========================================
echo.

echo 1. Checking Node.js version...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Node.js installed
) else (
    echo ✗ Node.js not installed
)
echo.

echo 2. Checking npm...
npm --version >nul 2>&1
if %errorlevel% equ 0 (
    npm --version
    echo ✓ npm installed
) else (
    echo ✗ npm not installed
)
echo.

echo 3. Checking Git repository...
if exist .git (
    echo ✓ Git repository initialized
    for /f "tokens=*" %%a in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set branch=%%a
    echo ✓ Current branch: %branch%
) else (
    echo ✗ Not a Git repository
)
echo.

echo 4. Checking required files...
if exist .env (echo ✓ Found: .env) else (echo ✗ Missing: .env)
if exist .env.example (echo ✓ Found: .env.example) else (echo ✗ Missing: .env.example)
if exist package.json (echo ✓ Found: package.json) else (echo ✗ Missing: package.json)
if exist netlify.toml (echo ✓ Found: netlify.toml) else (echo ✗ Missing: netlify.toml)
if exist next.config.ts (echo ✓ Found: next.config.ts) else (echo ✗ Missing: next.config.ts)
echo.

echo 5. Checking environment variables...
if exist .env (
    echo ✓ .env file found
) else (
    echo ✗ .env file not found
)
echo.

echo 6. Checking npm dependencies...
if exist node_modules (
    echo ✓ npm dependencies installed
) else (
    echo ⚠ node_modules not found - run: npm install
)
echo.

echo 7. Testing build...
echo Running: npm run build
npm run build >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Build succeeds
) else (
    echo ✗ Build failed
)
echo.

echo 8. Checking linting...
echo Running: npm run lint
npm run lint >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ No linting errors
) else (
    echo ⚠ Linting warnings/errors
)
echo.

echo 9. Checking TypeScript...
echo Running: npm run type-check
npm run type-check >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ No TypeScript errors
) else (
    echo ✗ TypeScript errors found
)
echo.

echo ==========================================
echo Pre-Deployment Checklist Complete
echo ==========================================
echo.
echo Next steps:
echo 1. git add . ^& git commit -m "Ready for deployment"
echo 2. git push origin main
echo 3. Go to https://app.netlify.com
echo 4. Connect your dough-house GitHub repository
echo 5. Set environment variables in Netlify UI
echo 6. Deploy
echo.
echo See NETLIFY_DEPLOYMENT.md for detailed instructions.
