const fs = require('fs');
const path = require('path');

async function pathExists(p) {
  try {
    await fs.promises.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true });
}

async function copyFileIfMissing(src, dest) {
  if (await pathExists(dest)) return false;
  await ensureDir(path.dirname(dest));
  await fs.promises.copyFile(src, dest);
  return true;
}

async function listFiles(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => path.join(dir, e.name));
}

async function walkDirs(rootDir, opts = {}) {
  const { maxDepth = 8 } = opts;
  const results = [];

  async function walk(current, depth) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = await fs.promises.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const fullPath = path.join(current, entry.name);

      // Avoid walking huge trees unnecessarily
      if (entry.name === '.git' || entry.name === '.next') continue;

      // We *do* want to find node_modules directories, but we don't want
      // to recurse into them (they can be enormous).
      if (entry.name === 'node_modules') {
        results.push(fullPath);
        continue;
      }

      results.push(fullPath);
      await walk(fullPath, depth + 1);
    }
  }

  await walk(rootDir, 0);
  return results;
}

function isPrismaEngineFile(filePath) {
  const base = path.basename(filePath);
  // Library engine (.so.node/.dylib.node/.dll.node) and binary engines
  return (
    base.startsWith('libquery_engine-') ||
    base.startsWith('query-engine-') ||
    base.endsWith('.so.node') ||
    base.endsWith('.dylib.node') ||
    base.endsWith('.dll.node')
  );
}

async function runEngineCopy({ utils }) {
  const repoRoot = process.cwd();

  const prismaClientDir = path.join(repoRoot, 'node_modules', '.prisma', 'client');
  if (!(await pathExists(prismaClientDir))) {
    utils.status.show({
      title: 'Prisma engine copy',
      summary: 'Skipped: node_modules/.prisma/client not found',
    });
    return;
  }

  const engineFiles = (await listFiles(prismaClientDir)).filter(isPrismaEngineFile);
  if (engineFiles.length === 0) {
    utils.status.show({
      title: 'Prisma engine copy',
      summary: 'Skipped: no engine files found to copy',
    });
    return;
  }

  const netlifyDir = path.join(repoRoot, '.netlify');
  const candidateRoots = [
    path.join(netlifyDir, 'functions'),
    path.join(netlifyDir, 'functions-internal'),
    path.join(netlifyDir, 'functions-serve'),
  ];

  const existingRoots = [];
  for (const r of candidateRoots) {
    if (await pathExists(r)) existingRoots.push(r);
  }

  if (existingRoots.length === 0) {
    utils.status.show({
      title: 'Prisma engine copy',
      summary: 'Skipped: no .netlify/functions* directory found',
    });
    return;
  }

  let totalCopied = 0;
  let prismaNodeModulesFound = 0;
  const engineNames = engineFiles.map((f) => path.basename(f));

  for (const root of existingRoots) {
    // Walk function folders and patch any node_modules we find
    const dirs = [root, ...(await walkDirs(root))];
    for (const dir of dirs) {
      if (path.basename(dir) !== 'node_modules') continue;

      // Only patch node_modules that contain prisma deps
      const prismaPkg = path.join(dir, 'prisma');
      const prismaClientPkg = path.join(dir, '@prisma', 'client');
      if (!(await pathExists(prismaPkg)) && !(await pathExists(prismaClientPkg))) continue;

      prismaNodeModulesFound += 1;

      // Prisma primarily looks for engines in node_modules/.prisma/client
      const destPrismaClientDir = path.join(dir, '.prisma', 'client');
      await ensureDir(destPrismaClientDir);

      // ...but it also reports searching node_modules/@prisma/client, so copy there too
      // as a belt-and-suspenders measure.
      const destPrismaClientPackageDir = path.join(dir, '@prisma', 'client');
      const shouldCopyIntoPrismaPackage = await pathExists(destPrismaClientPackageDir);

      for (const src of engineFiles) {
        const name = path.basename(src);
        const destA = path.join(destPrismaClientDir, name);
        const copiedA = await copyFileIfMissing(src, destA);
        if (copiedA) totalCopied += 1;

        if (shouldCopyIntoPrismaPackage) {
          const destB = path.join(destPrismaClientPackageDir, name);
          const copiedB = await copyFileIfMissing(src, destB);
          if (copiedB) totalCopied += 1;
        }
      }
    }
  }

  utils.status.show({
    title: 'Prisma engine copy',
    summary:
      prismaNodeModulesFound === 0
        ? `No function node_modules with Prisma detected; expected one containing @prisma/client. Available engines: ${engineNames.join(', ')}`
        : `Ensured Prisma engine files in Netlify function bundles (copied ${totalCopied}). Engines: ${engineNames.join(', ')}`,
  });
}

module.exports = {
  async onPostBuild({ utils }) {
    try {
      await runEngineCopy({ utils });
    } catch (error) {
      // Fail with a clear message rather than a generic "plugin internal error"
      utils.build.failBuild('Prisma engine copy plugin failed', { error });
    }
  },

  // Netlify's Next.js plugin may finalize function output late in the lifecycle.
  // Running again onSuccess makes this resilient to ordering differences.
  async onSuccess({ utils }) {
    try {
      await runEngineCopy({ utils });
    } catch (error) {
      utils.build.failBuild('Prisma engine copy plugin failed', { error });
    }
  },

  // And ensure we attempt a final time at the very end.
  async onEnd({ utils }) {
    try {
      await runEngineCopy({ utils });
    } catch (error) {
      utils.build.failBuild('Prisma engine copy plugin failed', { error });
    }
  },
};
