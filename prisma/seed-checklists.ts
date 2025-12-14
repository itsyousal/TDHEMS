import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Checklist seed data from the operational checklist Excel file
 * Organized by frequency with role assignments
 */

// Role slug mapping
const roleMapping: Record<string, string[]> = {
  'CK': ['cook', 'kitchen'],
  'CS': ['cashier'],
  'CA': ['counter-attendant', 'attendant'],
  'SUP': ['supervisor'],
  'MGR': ['manager'],
  'FND': ['founder', 'owner', 'admin'],
  'MAINT': ['maintenance'],
  'CK / SUP': ['cook', 'kitchen', 'supervisor'],
  'CK / CA': ['cook', 'kitchen', 'counter-attendant', 'attendant'],
  'CK / MGR': ['cook', 'kitchen', 'manager'],
  'SUP / MGR': ['supervisor', 'manager'],
  'MGR / SUP': ['manager', 'supervisor'],
  'MGR / FND': ['manager', 'founder', 'owner', 'admin'],
  'FND / CK': ['founder', 'owner', 'admin', 'cook', 'kitchen'],
  'Vendor + SUP': ['supervisor'],
  'SUP + MAINT': ['supervisor', 'maintenance'],
  'Accountant / FND': ['founder', 'owner', 'admin'],
};

// Function to parse roles from the suggested role field
function parseRoles(suggestedRole: string): string[] {
  const normalized = suggestedRole.trim();
  if (roleMapping[normalized]) {
    return roleMapping[normalized];
  }
  // Try to find partial matches
  for (const [key, value] of Object.entries(roleMapping)) {
    if (normalized.includes(key)) {
      return value;
    }
  }
  // Default to manager if unknown
  return ['manager'];
}

// Normalize frequency
function normalizeFrequency(frequency: string): 'daily' | 'weekly' | 'monthly' {
  const freq = frequency.toLowerCase();
  if (freq.includes('daily')) return 'daily';
  if (freq.includes('weekly')) return 'weekly';
  if (freq.includes('monthly')) return 'monthly';
  if (freq.includes('quarterly') || freq.includes('half') || freq.includes('yearly')) {
    return 'monthly'; // Group less frequent into monthly for now
  }
  return 'daily';
}

// Checklist items from Excel
const checklistData = [
  { task: "Batch QC for every production batch (weight, color, structure)", frequency: "Daily", executionTime: "During each batch", role: "CK" },
  { task: "Cash till reconciliation check (shiftly)", frequency: "Daily", executionTime: "Mid-shift & end of shift", role: "CS" },
  { task: "Cash, POS, UPI reconciliation", frequency: "Daily", executionTime: "End of day", role: "CS" },
  { task: "Check CCTV operational status", frequency: "Daily", executionTime: "10 mins before opening", role: "SUP" },
  { task: "Check fire extinguishers (pressure, accessibility)", frequency: "Daily", executionTime: "10 mins before opening", role: "SUP" },
  { task: "Check fuel dispenser nozzles and leak indicators", frequency: "Daily", executionTime: "10 mins before opening", role: "SUP" },
  { task: "Confirm emergency numbers and signage visibility", frequency: "Daily", executionTime: "5 mins before opening", role: "SUP" },
  { task: "Customer complaint logging and follow-up", frequency: "Daily", executionTime: "Immediate upon complaint", role: "MGR" },
  { task: "Deep cleaning of grease traps and drains", frequency: "Daily", executionTime: "End of day", role: "CK" },
  { task: "Equipment warm-up (ovens, mixers, POS devices)", frequency: "Daily", executionTime: "30 mins before production", role: "CK" },
  { task: "Facility walkthrough for cleanliness, leaks, odors, hazards", frequency: "Daily", executionTime: "15 mins before opening", role: "SUP / MGR" },
  { task: "FIFO rotation on shelves and storage", frequency: "Daily", executionTime: "Throughout shift", role: "CA" },
  { task: "Final temp check for all storage units", frequency: "Daily", executionTime: "End of day", role: "CK" },
  { task: "Forecourt safety patrol (spills, smoking, hazards)", frequency: "Daily", executionTime: "Every 1–2 hours", role: "CA" },
  { task: "Full cleaning of utensils, surfaces, floor", frequency: "Daily", executionTime: "End of day", role: "CK / CA" },
  { task: "Ingredient stock verification (raw materials & packaging)", frequency: "Daily", executionTime: "60–90 mins before production", role: "CK" },
  { task: "Locking and security verification", frequency: "Daily", executionTime: "End of day", role: "SUP" },
  { task: "Production end-of-day QC sample storage", frequency: "Daily", executionTime: "End of day", role: "CK" },
  { task: "Raw material QC (visual, smell, packaging integrity)", frequency: "Daily", executionTime: "45 mins before production", role: "CK" },
  { task: "Record baking temperature and time per batch", frequency: "Daily", executionTime: "During each batch", role: "CK" },
  { task: "Record fridge, freezer, chiller temperatures", frequency: "Daily", executionTime: "10 mins before opening", role: "CK / SUP" },
  { task: "Sample taste QC for each batch", frequency: "Daily", executionTime: "During each batch", role: "CK / MGR" },
  { task: "Set CCPs for the day (baking temp/time, cooling limits)", frequency: "Daily", executionTime: "Before production", role: "CK / MGR" },
  { task: "Staff hygiene check: uniform, hairnets, gloves", frequency: "Daily", executionTime: "10 mins before opening", role: "SUP" },
  { task: "Surface sanitization with approved chemicals", frequency: "Daily", executionTime: "30 mins before production", role: "CK" },
  { task: "Temperature monitoring for cold/hot storage", frequency: "Daily", executionTime: "Every 3 hours", role: "CK / CA" },
  { task: "Test POS system, UPI, card machine, print test receipt", frequency: "Daily", executionTime: "5 mins before opening", role: "CS" },
  { task: "Verify first-aid kit contents", frequency: "Daily", executionTime: "10 mins before opening", role: "SUP" },
  { task: "Verify spill kit availability and completeness", frequency: "Daily", executionTime: "10 mins before opening", role: "SUP" },
  { task: "Waste disposal logging (food, packaging, oil)", frequency: "Daily", executionTime: "End of day", role: "CK" },
  { task: "Inventory cycle count for fast-moving items", frequency: "Weekly", executionTime: "Any fixed day, morning", role: "SUP" },
  { task: "Variance calculation between system and physical stock", frequency: "Weekly", executionTime: "After cycle count", role: "SUP / MGR" },
  { task: "Preparation and issuance of POs to suppliers", frequency: "Weekly", executionTime: "After stock count", role: "MGR" },
  { task: "Supplier delivery quality review", frequency: "Weekly", executionTime: "After deliveries", role: "SUP" },
  { task: "Weekly attendance, extra shifts, incentive summary", frequency: "Weekly", executionTime: "Weekly review hour", role: "MGR" },
  { task: "Weekly one-on-one employee check-ins", frequency: "Weekly", executionTime: "Scheduled time", role: "SUP" },
  { task: "Short weekly training (safety, hygiene, customer handling)", frequency: "Weekly", executionTime: "Scheduled slot", role: "MGR" },
  { task: "Equipment minor maintenance (oven filters, seals)", frequency: "Weekly", executionTime: "During maintenance window", role: "CK / SUP" },
  { task: "Verification of completed deep-clean areas", frequency: "Weekly", executionTime: "End of week", role: "SUP" },
  { task: "Review of weekly QC logs and deviations", frequency: "Weekly", executionTime: "Weekly review meeting", role: "MGR" },
  { task: "Customer feedback aggregation & analysis", frequency: "Weekly", executionTime: "Weekly review meeting", role: "MGR" },
  { task: "Full physical inventory count (all SKUs)", frequency: "Monthly", executionTime: "Start or end of month", role: "MGR / SUP" },
  { task: "Expiry review for all stock", frequency: "Monthly", executionTime: "After inventory count", role: "SUP" },
  { task: "Reconciliation of vendor invoices & payments", frequency: "Monthly", executionTime: "Month-end", role: "MGR" },
  { task: "Monthly P&L and cashflow report preparation", frequency: "Monthly", executionTime: "Month-end", role: "FND / MGR" },
  { task: "Employee monthly performance evaluation", frequency: "Monthly", executionTime: "Month-end", role: "MGR" },
  { task: "Update roster & leave calendar", frequency: "Monthly", executionTime: "Month-end", role: "MGR" },
  { task: "Calibration of weighing scales, thermometers", frequency: "Monthly", executionTime: "Month-end", role: "SUP" },
  { task: "Fuel dispenser calibration verification", frequency: "Monthly", executionTime: "As per schedule", role: "SUP" },
  { task: "Monthly HACCP file review", frequency: "Monthly", executionTime: "Month-end", role: "MGR" },
  { task: "Compliance & license documentation check", frequency: "Monthly", executionTime: "Month-end", role: "MGR" },
  { task: "Quarterly tax and statutory documentation", frequency: "Quarterly", executionTime: "As per govt timeline", role: "Accountant / FND" },
  { task: "Vendor contract performance review & renegotiation", frequency: "Quarterly", executionTime: "Quarterly planning day", role: "FND" },
  { task: "Two-day skill development training (advanced topics)", frequency: "Quarterly", executionTime: "Scheduled dates", role: "MGR" },
  { task: "Employee satisfaction pulse survey", frequency: "Quarterly", executionTime: "Quarterly review period", role: "MGR" },
  { task: "Full equipment servicing (all major equipment)", frequency: "Quarterly", executionTime: "Scheduled maintenance day", role: "SUP + MAINT" },
  { task: "Pest control deep treatment", frequency: "Quarterly", executionTime: "Scheduled day", role: "Vendor + SUP" },
  { task: "Quarterly KPI review and planning", frequency: "Quarterly", executionTime: "Quarterly review day", role: "FND" },
  { task: "Recompute reorder points & safety stock", frequency: "Half-Yearly", executionTime: "Mid-year planning", role: "MGR" },
  { task: "Salary/compensation benchmarking", frequency: "Half-Yearly", executionTime: "Mid-year review", role: "FND" },
  { task: "Risk register update", frequency: "Half-Yearly", executionTime: "Mid-year review", role: "FND" },
  { task: "Insurance renewal / revision", frequency: "Half-Yearly", executionTime: "Mid-year review", role: "FND" },
  { task: "Full performance review vs annual plan", frequency: "Half-Yearly", executionTime: "Mid-year strategic review", role: "FND" },
  { task: "Annual financial audit preparation", frequency: "Yearly", executionTime: "Audit month", role: "Accountant / FND" },
  { task: "Full annual business plan creation", frequency: "Yearly", executionTime: "Start of new FY", role: "FND" },
  { task: "Annual menu/product line redesign", frequency: "Yearly", executionTime: "Annual planning", role: "FND / CK" },
  { task: "Major equipment replacement planning", frequency: "Yearly", executionTime: "Annual capex planning", role: "FND" },
  { task: "Yearly performance appraisals & promotions", frequency: "Yearly", executionTime: "Appraisal month", role: "MGR / FND" },
  { task: "Annual safety drill (fire, evacuation)", frequency: "Yearly", executionTime: "Scheduled drill day", role: "SUP" },
  { task: "End-of-year inventory & asset verification", frequency: "Yearly", executionTime: "Year-end", role: "MGR" },
  { task: "Annual branding and marketing strategy", frequency: "Yearly", executionTime: "Start of year", role: "FND" },
];

// Group by checklist categories
const checklistGroups = [
  {
    name: 'Daily Opening Checklist',
    description: 'Essential checks before opening for business',
    frequency: 'daily' as const,
    dueTime: '09:00',
    items: [
      'Check CCTV operational status',
      'Check fire extinguishers (pressure, accessibility)',
      'Check fuel dispenser nozzles and leak indicators',
      'Confirm emergency numbers and signage visibility',
      'Staff hygiene check: uniform, hairnets, gloves',
      'Record fridge, freezer, chiller temperatures',
      'Verify first-aid kit contents',
      'Verify spill kit availability and completeness',
      'Test POS system, UPI, card machine, print test receipt',
      'Facility walkthrough for cleanliness, leaks, odors, hazards',
    ],
    roles: ['supervisor', 'manager'],
  },
  {
    name: 'Daily Production Checklist',
    description: 'Quality control and production preparation',
    frequency: 'daily' as const,
    dueTime: '08:00',
    items: [
      'Ingredient stock verification (raw materials & packaging)',
      'Raw material QC (visual, smell, packaging integrity)',
      'Surface sanitization with approved chemicals',
      'Equipment warm-up (ovens, mixers, POS devices)',
      'Set CCPs for the day (baking temp/time, cooling limits)',
      'Batch QC for every production batch (weight, color, structure)',
      'Record baking temperature and time per batch',
      'Sample taste QC for each batch',
      'Temperature monitoring for cold/hot storage',
    ],
    roles: ['cook', 'kitchen', 'manager'],
    requiresPhotoEvidence: true,
  },
  {
    name: 'Daily Closing Checklist',
    description: 'End of day cleanup and security checks',
    frequency: 'daily' as const,
    dueTime: '21:00',
    items: [
      'Cash till reconciliation check (shiftly)',
      'Cash, POS, UPI reconciliation',
      'Deep cleaning of grease traps and drains',
      'Full cleaning of utensils, surfaces, floor',
      'Final temp check for all storage units',
      'Production end-of-day QC sample storage',
      'Waste disposal logging (food, packaging, oil)',
      'Locking and security verification',
    ],
    roles: ['cashier', 'cook', 'kitchen', 'supervisor'],
  },
  {
    name: 'Daily Operations Checklist',
    description: 'Ongoing operational tasks throughout the day',
    frequency: 'daily' as const,
    dueTime: '14:00',
    items: [
      'FIFO rotation on shelves and storage',
      'Forecourt safety patrol (spills, smoking, hazards)',
      'Customer complaint logging and follow-up',
    ],
    roles: ['counter-attendant', 'attendant', 'manager'],
  },
  {
    name: 'Weekly Inventory & Stock',
    description: 'Weekly inventory management tasks',
    frequency: 'weekly' as const,
    dueTime: '10:00',
    items: [
      'Inventory cycle count for fast-moving items',
      'Variance calculation between system and physical stock',
      'Preparation and issuance of POs to suppliers',
      'Supplier delivery quality review',
    ],
    roles: ['supervisor', 'manager'],
  },
  {
    name: 'Weekly HR & Training',
    description: 'Weekly employee management and development',
    frequency: 'weekly' as const,
    dueTime: '16:00',
    items: [
      'Weekly attendance, extra shifts, incentive summary',
      'Weekly one-on-one employee check-ins',
      'Short weekly training (safety, hygiene, customer handling)',
    ],
    roles: ['manager', 'supervisor'],
  },
  {
    name: 'Weekly Quality & Maintenance',
    description: 'Weekly quality review and equipment maintenance',
    frequency: 'weekly' as const,
    dueTime: '17:00',
    items: [
      'Equipment minor maintenance (oven filters, seals)',
      'Verification of completed deep-clean areas',
      'Review of weekly QC logs and deviations',
      'Customer feedback aggregation & analysis',
    ],
    roles: ['manager', 'supervisor', 'cook', 'kitchen'],
  },
  {
    name: 'Monthly Finance & Compliance',
    description: 'Monthly financial and compliance checks',
    frequency: 'monthly' as const,
    dueTime: '10:00',
    items: [
      'Reconciliation of vendor invoices & payments',
      'Monthly P&L and cashflow report preparation',
      'Monthly HACCP file review',
      'Compliance & license documentation check',
    ],
    roles: ['manager', 'founder', 'owner', 'admin'],
  },
  {
    name: 'Monthly Inventory & Calibration',
    description: 'Monthly full inventory and equipment calibration',
    frequency: 'monthly' as const,
    dueTime: '09:00',
    items: [
      'Full physical inventory count (all SKUs)',
      'Expiry review for all stock',
      'Calibration of weighing scales, thermometers',
      'Fuel dispenser calibration verification',
    ],
    roles: ['manager', 'supervisor'],
  },
  {
    name: 'Monthly HR Review',
    description: 'Monthly employee performance and scheduling',
    frequency: 'monthly' as const,
    dueTime: '15:00',
    items: [
      'Employee monthly performance evaluation',
      'Update roster & leave calendar',
    ],
    roles: ['manager'],
  },
];

async function main() {
  console.log('Starting checklist seed...');

  // Get the first organization
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('No organization found. Please create an organization first.');
    process.exit(1);
  }

  console.log(`Seeding checklists for organization: ${org.name}`);

  // Get the default location (or first location)
  const location = await prisma.location.findFirst({
    where: { orgId: org.id },
  });

  let createdCount = 0;

  for (const group of checklistGroups) {
    // Check if checklist already exists
    const existing = await prisma.checklist.findFirst({
      where: {
        orgId: org.id,
        name: group.name,
      },
    });

    if (existing) {
      console.log(`Checklist "${group.name}" already exists, skipping...`);
      continue;
    }

    // Create checklist with items
    const checklist = await prisma.checklist.create({
      data: {
        orgId: org.id,
        locationId: location?.id || null,
        name: group.name,
        description: group.description,
        frequency: group.frequency,
        dueTime: group.dueTime,
        requiresPhotoEvidence: group.requiresPhotoEvidence || false,
        escalationTime: group.frequency === 'daily' ? 60 : 1440, // 1 hour for daily, 24 hours otherwise
        isActive: true,
        roles: group.roles,
        items: {
          create: group.items.map((item, index) => ({
            title: item,
            description: null,
            order: index + 1,
            isRequired: item.toLowerCase().includes('safety') || 
                       item.toLowerCase().includes('temperature') ||
                       item.toLowerCase().includes('haccp') ||
                       item.toLowerCase().includes('fire'),
          })),
        },
      },
    });

    console.log(`Created checklist: ${checklist.name} with ${group.items.length} items`);
    createdCount++;
  }

  console.log(`\nSeeding complete! Created ${createdCount} checklists.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
