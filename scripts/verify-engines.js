const fs = require('fs');
const path = require('path');

const prismaClientDir = path.join(process.cwd(), 'node_modules', '.prisma', 'client');

console.log('--- DEBUG: Verifying Prisma Engines ---');
console.log(`Checking directory: ${prismaClientDir}`);

if (fs.existsSync(prismaClientDir)) {
    const files = fs.readdirSync(prismaClientDir);
    console.log('Files found:');
    files.forEach(file => {
        console.log(` - ${file}`);
    });
} else {
    console.error('ERROR: node_modules/.prisma/client directory NOT found!');
}

const prismaPackageDir = path.join(process.cwd(), 'node_modules', '@prisma', 'client');
console.log(`Checking directory: ${prismaPackageDir}`);

if (fs.existsSync(prismaPackageDir)) {
    const files = fs.readdirSync(prismaPackageDir);
    console.log('Files found:');
    files.forEach(file => {
        // only log engine-like files to avoid noise
        if (file.includes('engine') || file.endsWith('.node')) {
            console.log(` - ${file}`);
        }
    });
} else {
    console.error('ERROR: node_modules/@prisma/client directory NOT found!');
}

console.log('--- DEBUG: End Verification ---');
