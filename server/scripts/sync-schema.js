const fs = require('fs');
const path = require('path');

const serverSchemaPath = path.join(__dirname, '../prisma/schema.prisma');
const rootSchemaPath = path.join(__dirname, '../../prisma/schema.prisma');

console.log('🔄 Synchronizing Prisma schema...');
console.log(`Source: ${serverSchemaPath}`);
console.log(`Target: ${rootSchemaPath}`);

if (!fs.existsSync(serverSchemaPath)) {
  console.error('❌ Source schema does not exist!');
  process.exit(1);
}

const serverSchema = fs.readFileSync(serverSchemaPath, 'utf8');
fs.writeFileSync(rootSchemaPath, serverSchema, 'utf8');

console.log('✅ Prisma schema synchronized successfully from server to root.');

