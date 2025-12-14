require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'test.employee@doughhouse.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        console.log('User already exists');
        return;
    }

    // Get org (assuming one exists, or create one)
    let org = await prisma.organization.findFirst();
    if (!org) {
        org = await prisma.organization.create({
            data: {
                name: 'Dough House',
                slug: 'dough-house',
            }
        });
    }

    // Create User
    const user = await prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            firstName: 'Test',
            lastName: 'Employee',
            isActive: true,
            activationDate: new Date(),
        },
    });

    // Create Employee
    const employee = await prisma.employee.create({
        data: {
            userId: user.id,
            orgId: org.id,
            employeeId: 'EMP-TEST-001',
            firstName: 'Test',
            lastName: 'Employee',
            email,
            department: 'Kitchen',
            designation: 'Barista',
            joinDate: new Date(),
            salary: 30000,
            status: 'active',
        },
    });

    // Assign Role
    const role = await prisma.role.findFirst({ where: { slug: 'employee' } });
    if (role) {
        await prisma.userRole.create({
            data: {
                userId: user.id,
                roleId: role.id,
                orgId: org.id,
            },
        });
    }

    // Map User to Org
    await prisma.userOrgMap.create({
        data: {
            userId: user.id,
            orgId: org.id
        }
    });

    console.log('Test employee created successfully');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
