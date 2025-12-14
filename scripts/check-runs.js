const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Check checklist runs
    const runs = await prisma.checklistRun.findMany({
      take: 10,
      orderBy: { startedAt: 'desc' },
      include: {
        checklist: { select: { name: true } },
        user: { select: { firstName: true, lastName: true, email: true } }
      }
    });
    
    console.log('=== CHECKLIST RUN HISTORY ===');
    console.log(`Total runs found: ${runs.length}`);
    
    if (runs.length > 0) {
      runs.forEach(run => {
        console.log(`\n- ${run.checklist?.name}`);
        console.log(`  Status: ${run.status}`);
        console.log(`  Started: ${run.startedAt}`);
        console.log(`  Completed: ${run.completedAt || 'Not completed'}`);
        console.log(`  User: ${run.user?.firstName} ${run.user?.lastName}`);
      });
    } else {
      console.log('No checklist runs yet.');
    }

    // Check evidence
    const evidence = await prisma.checklistEvidence.count();
    console.log(`\nTotal evidence records: ${evidence}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
