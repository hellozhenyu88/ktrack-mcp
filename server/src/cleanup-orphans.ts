import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const pool = await prisma.talentPool.findMany();
    const userIds = (await prisma.user.findMany({ select: { id: true } })).map(u => u.id);
    const orphanIds = pool.filter(t => !userIds.includes(t.freelancerId)).map(t => t.id);
    if (orphanIds.length > 0) {
        await prisma.talentPool.deleteMany({ where: { id: { in: orphanIds } } });
        console.log(`Deleted ${orphanIds.length} orphaned talent pool entries`);
    } else {
        console.log('No orphaned entries found');
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
