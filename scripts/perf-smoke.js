// Simple perf smoke script
// Usage: node scripts/perf-smoke.js [baseUrl] [iterations]
// Example: BASE_URL=http://localhost:3000 node scripts/perf-smoke.js http://localhost:3000 5

const fetch = global.fetch || require('node-fetch');
const [,, argBase, argIter] = process.argv;
const BASE = process.env.BASE_URL || argBase || 'http://localhost:3000';
const ITER = parseInt(argIter || '3', 10);

const endpoints = [
  '/api/orders?limit=10',
  '/api/finance/transactions?limit=10',
  '/api/finance/stats',
  '/api/inventory?limit=10',
  '/api/menu?limit=10',
];

function percentile(arr, p) {
  if (!arr.length) return 0;
  arr.sort((a,b)=>a-b);
  const idx = Math.ceil((p/100)*arr.length)-1;
  return arr[Math.max(0, idx)];
}

(async ()=>{
  console.log(`Running smoke tests against ${BASE} (${ITER} iterations)`);
  for (const ep of endpoints) {
    const times = [];
    for (let i=0;i<ITER;i++){
      const url = BASE.replace(/\/$/, '') + ep;
      const t0 = Date.now();
      try{
        const r = await fetch(url, { method: 'GET' });
        const body = await r.text();
        const dt = Date.now()-t0;
        times.push(dt);
        process.stdout.write(`${ep} [${i+1}/${ITER}] ${r.status} ${dt}ms\r`);
      }catch(e){
        const dt = Date.now()-t0;
        times.push(99999);
        console.error(`\nError fetching ${ep}:`, e.message || e);
      }
      await new Promise(res=>setTimeout(res, 200));
    }
    console.log(`\nEndpoint: ${ep}`);
    console.log(`  p50: ${percentile(times,50)}ms  p95: ${percentile(times,95)}ms  p99: ${percentile(times,99)}ms  avg: ${Math.round(times.reduce((a,b)=>a+b,0)/times.length)}ms`);
  }
})();
