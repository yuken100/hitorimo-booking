import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const hours = [10, 14];
const days = 14;
const rows = [];

for (let i = 1; i <= days; i++) {
  const d = new Date();
  d.setDate(d.getDate() + i);
  const dow = d.getDay();
  if (dow === 0 || dow === 6) continue;
  const ymd = d.toISOString().slice(0, 10);
  for (const h of hours) {
    const hh = String(h).padStart(2, '0');
    const hh2 = String(h + 1).padStart(2, '0');
    rows.push({
      startTime: new Date(`${ymd}T${hh}:00:00+09:00`),
      endTime: new Date(`${ymd}T${hh2}:00:00+09:00`),
      status: 'OPEN',
    });
  }
}

const result = await prisma.slot.createMany({ data: rows });
console.log(`created ${result.count} slots`);
await prisma.$disconnect();
