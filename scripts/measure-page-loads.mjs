// Page Load Time Measurement Script using Playwright
// Logs in as admin and visits every dashboard page, measuring load times

import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

const PAGES = [
  { name: 'Login Page', path: '/auth/login' },
  { name: 'Dashboard Home', path: '/dashboard' },
  { name: 'Admin Panel', path: '/dashboard/admin' },
  { name: 'Access Management', path: '/dashboard/admin/access-management' },
  { name: 'Password Management', path: '/dashboard/admin/password-management' },
  { name: 'Automation', path: '/dashboard/automation' },
  { name: 'Checklists', path: '/dashboard/checklists' },
  { name: 'Checklists Analytics', path: '/dashboard/checklists/analytics' },
  { name: 'CRM', path: '/dashboard/crm' },
  { name: 'Customers', path: '/dashboard/customers' },
  { name: 'Employees', path: '/dashboard/employees' },
  { name: 'Equipment', path: '/dashboard/equipment' },
  { name: 'Finance', path: '/dashboard/finance' },
  { name: 'HR', path: '/dashboard/hr' },
  { name: 'Inventory', path: '/dashboard/inventory' },
  { name: 'Marketing', path: '/dashboard/marketing' },
  { name: 'Menu', path: '/dashboard/menu' },
  { name: 'Orders', path: '/dashboard/orders' },
  { name: 'Production', path: '/dashboard/production' },
  { name: 'Sales', path: '/dashboard/sales' },
  { name: 'Settings', path: '/dashboard/settings' },
  { name: 'Shifts', path: '/dashboard/shifts' },
  { name: 'Warehouse', path: '/dashboard/warehouse' },
  { name: 'POS', path: '/pos' },
  { name: 'Order Portal', path: '/order' },
];

async function measurePageLoad(page, name, url) {
  const start = performance.now();
  
  try {
    // Navigate and wait for the network to be idle (all requests done)
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    const networkIdleTime = performance.now() - start;
    
    // Also wait for DOM content to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    
    // Get Performance API timing from the browser
    const perfTiming = await page.evaluate(() => {
      const entries = performance.getEntriesByType('navigation');
      if (entries.length > 0) {
        const nav = entries[0];
        return {
          domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
          loadComplete: Math.round(nav.loadEventEnd - nav.startTime),
          domInteractive: Math.round(nav.domInteractive - nav.startTime),
          responseEnd: Math.round(nav.responseEnd - nav.startTime),
          transferSize: nav.transferSize,
        };
      }
      return null;
    });
    
    // Count resource requests
    const resourceCount = await page.evaluate(() => {
      return performance.getEntriesByType('resource').length;
    });
    
    // Check for any visible error messages on the page
    const hasError = await page.evaluate(() => {
      const body = document.body?.innerText || '';
      return body.includes('500') || body.includes('Internal Server Error') || 
             body.includes('404') || body.includes('Not Found') ||
             body.includes('Application error');
    });

    // Get the page title or first heading
    const pageTitle = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1?.innerText || document.title || 'N/A';
    });
    
    return {
      name,
      url,
      totalTime: Math.round(networkIdleTime),
      domContentLoaded: perfTiming?.domContentLoaded || null,
      loadComplete: perfTiming?.loadComplete || null,
      domInteractive: perfTiming?.domInteractive || null,
      responseTime: perfTiming?.responseEnd || null,
      resourceCount,
      transferSize: perfTiming?.transferSize || null,
      hasError,
      pageTitle,
      status: 'OK'
    };
  } catch (err) {
    const elapsed = Math.round(performance.now() - start);
    return {
      name,
      url,
      totalTime: elapsed,
      status: 'ERROR',
      error: err.message,
    };
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('  DOUGH HOUSE - Page Load Time Measurement');
  console.log('  ' + new Date().toISOString());
  console.log('='.repeat(80));
  console.log('');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Step 1: Login
  console.log('[LOGIN] Navigating to login page...');
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle', timeout: 30000 });

  // Fill in credentials
  await page.fill('#email', 'admin@test.com');
  await page.fill('#password', 'admin123');

  // Click submit
  const loginStart = performance.now();
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard
  try {
    await page.waitForURL('**/dashboard**', { timeout: 30000 });
    const loginTime = Math.round(performance.now() - loginStart);
    console.log(`[LOGIN] Successfully logged in! (${loginTime}ms)`);
    console.log(`[LOGIN] Redirected to: ${page.url()}`);
  } catch (err) {
    console.error('[LOGIN] FAILED:', err.message);
    console.error('[LOGIN] Current URL:', page.url());
    const pageContent = await page.textContent('body');
    console.error('[LOGIN] Page content (first 500 chars):', pageContent?.substring(0, 500));
    await browser.close();
    process.exit(1);
  }

  console.log('');
  console.log('-'.repeat(80));
  console.log('  Measuring page load times...');
  console.log('-'.repeat(80));
  console.log('');

  // Step 2: Measure each page
  const results = [];

  for (const { name, path } of PAGES) {
    const url = `${BASE_URL}${path}`;
    console.log(`[MEASURING] ${name} (${path})...`);
    const result = await measurePageLoad(page, name, url);
    results.push(result);

    if (result.status === 'OK') {
      console.log(`  ✓ ${result.totalTime}ms (DOM: ${result.domContentLoaded || '?'}ms, Resources: ${result.resourceCount})`);
    } else {
      console.log(`  ✗ ERROR after ${result.totalTime}ms: ${result.error}`);
    }
  }

  await browser.close();

  // Step 3: Print summary
  console.log('');
  console.log('='.repeat(100));
  console.log('  RESULTS SUMMARY');
  console.log('='.repeat(100));
  console.log('');
  
  // Table header
  console.log(
    'Page'.padEnd(28) + 
    'Total(ms)'.padStart(12) + 
    'DOM(ms)'.padStart(10) + 
    'Response(ms)'.padStart(14) + 
    'Resources'.padStart(12) +
    'Status'.padStart(10)
  );
  console.log('-'.repeat(86));

  const okResults = results.filter(r => r.status === 'OK');
  const errorResults = results.filter(r => r.status === 'ERROR');

  // Sort by total time descending (slowest first)
  okResults.sort((a, b) => b.totalTime - a.totalTime);

  for (const r of okResults) {
    const errorFlag = r.hasError ? ' ⚠' : '';
    console.log(
      (r.name + errorFlag).padEnd(28) + 
      String(r.totalTime).padStart(12) + 
      String(r.domContentLoaded || '?').padStart(10) + 
      String(r.responseTime || '?').padStart(14) + 
      String(r.resourceCount).padStart(12) +
      'OK'.padStart(10)
    );
  }

  for (const r of errorResults) {
    console.log(
      r.name.padEnd(28) + 
      String(r.totalTime).padStart(12) + 
      '?'.padStart(10) + 
      '?'.padStart(14) + 
      '?'.padStart(12) +
      'ERROR'.padStart(10)
    );
  }

  console.log('-'.repeat(86));

  // Stats
  if (okResults.length > 0) {
    const times = okResults.map(r => r.totalTime);
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const max = Math.max(...times);
    const min = Math.min(...times);
    const slowest = okResults[0];
    const fastest = okResults[okResults.length - 1];

    console.log('');
    console.log(`  Total pages tested:  ${results.length}`);
    console.log(`  Successful:          ${okResults.length}`);
    console.log(`  Errors:              ${errorResults.length}`);
    console.log('');
    console.log(`  Average load time:   ${avg}ms`);
    console.log(`  Fastest:             ${min}ms (${fastest.name})`);
    console.log(`  Slowest:             ${max}ms (${slowest.name})`);
    
    // Flag pages over thresholds
    const slow = okResults.filter(r => r.totalTime > 5000);
    const moderate = okResults.filter(r => r.totalTime > 3000 && r.totalTime <= 5000);
    
    if (slow.length > 0) {
      console.log('');
      console.log('  ⚠ SLOW PAGES (>5s):');
      for (const r of slow) {
        console.log(`    - ${r.name}: ${r.totalTime}ms`);
      }
    }
    if (moderate.length > 0) {
      console.log('');
      console.log('  ⚡ MODERATE PAGES (3-5s):');
      for (const r of moderate) {
        console.log(`    - ${r.name}: ${r.totalTime}ms`);
      }
    }
    
    // Pages with errors on them
    const pagesWithErrors = okResults.filter(r => r.hasError);
    if (pagesWithErrors.length > 0) {
      console.log('');
      console.log('  ⚠ PAGES WITH VISIBLE ERRORS:');
      for (const r of pagesWithErrors) {
        console.log(`    - ${r.name} (${r.url})`);
      }
    }
  }

  console.log('');
  console.log('='.repeat(100));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
