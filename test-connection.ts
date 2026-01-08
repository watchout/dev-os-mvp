import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './src/generated/prisma';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('✅ Database connected successfully!');
    console.log(result);
    
    // テーブル確認
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    console.log('\n📊 Tables in database:');
    console.log(tables);
  } catch (err: unknown) {
    console.error('❌ Connection failed:', err instanceof Error ? err.message : err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
