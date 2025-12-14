const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    const checklistCount = await prisma.checklist.count();
    console.log('Checklist count:', checklistCount);
    
    const itemCount = await prisma.checklistItem.count();
    console.log('Item count:', itemCount);
    
    const checklists = await prisma.checklist.findMany({
      include: { items: true, _count: { select: { items: true } } },
    });
    
    console.log('\nChecklists:');
    checklists.forEach(c => {
      console.log(`- ${c.name} (${c.frequency}): ${c._count.items} items, roles: [${c.roles.join(', ')}]`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
