// Archived root production page moved here to avoid route conflicts with (dashboard)/production
import React from 'react';
import prisma from '@/lib/db';

export default async function ArchivedProductionPage() {
  const batches = await prisma.productionBatch.findMany({ take: 5, orderBy: { plannedDate: 'desc' } });
  return (
    <div className="p-6">
      <h2 className="text-lg font-medium">Archived Production Page</h2>
      <ul className="mt-4 list-disc pl-5">
        {batches.map((b) => (
          <li key={b.id}>{b.batchNumber}</li>
        ))}
      </ul>
    </div>
  );
}
