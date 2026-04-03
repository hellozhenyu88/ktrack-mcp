import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const enterprise = await prisma.enterprise.findFirst();
    if (!enterprise) { console.log('No enterprise found'); return; }

    const adminUser = await prisma.user.findUnique({ where: { id: enterprise.userId } });
    if (!adminUser) { console.log('No admin user found'); return; }

    // Clean existing seed data
    await prisma.enterpriseMember.deleteMany({ where: { enterpriseId: enterprise.id } });
    await prisma.role.deleteMany({ where: { enterpriseId: enterprise.id } });
    await prisma.message.deleteMany({ where: { receiverId: adminUser.id } });
    // Delete extra member users (P5 specific phones only)
    for (const phone of ['13900002001', '13900002002', '13900002003']) {
        await prisma.user.deleteMany({ where: { phone } });
    }
    console.log('🧹 Cleaned existing P5 data');

    // 1. Create roles one by one (avoids JSON serialization issues with createMany)
    const allPerms = ['task:read', 'task:write', 'task:delete', 'talent:read', 'talent:invite', 'finance:read', 'finance:write', 'system:admin'];
    const adminRole = await prisma.role.create({ data: { enterpriseId: enterprise.id, name: '超级管理员', permissions: allPerms } });
    const finRole = await prisma.role.create({ data: { enterpriseId: enterprise.id, name: '财务', permissions: ['finance:read', 'finance:write', 'task:read'] } });
    const hrRole = await prisma.role.create({ data: { enterpriseId: enterprise.id, name: 'HR', permissions: ['talent:read', 'talent:invite', 'task:read', 'task:write'] } });
    const memberRole = await prisma.role.create({ data: { enterpriseId: enterprise.id, name: '普通成员', permissions: ['task:read'] } });
    console.log('✅ 4 个角色已创建');

    // 2. Create members
    await prisma.enterpriseMember.create({ data: { enterpriseId: enterprise.id, userId: adminUser.id, roleId: adminRole.id } });

    const memberData = [
        { phone: '13900002001', displayName: '李财务', roleId: finRole.id },
        { phone: '13900002002', displayName: '王HR', roleId: hrRole.id },
        { phone: '13900002003', displayName: '赵项目', roleId: memberRole.id },
    ];
    for (const md of memberData) {
        const user = await prisma.user.create({ data: { phone: md.phone, displayName: md.displayName, role: 'enterprise' } });
        await prisma.enterpriseMember.create({ data: { enterpriseId: enterprise.id, userId: user.id, roleId: md.roleId } });
    }
    console.log('✅ 4 个企业成员已创建');

    // 3. Create messages
    const msgs = [
        { receiverId: adminUser.id, type: 'task' as const, title: '任务进度更新', content: '张小凡在「企业级 CRM 系统开发」任务中提交了阶段一成果。', isRead: false, createdAt: new Date(Date.now() - 5 * 60000) },
        { receiverId: adminUser.id, type: 'system' as const, title: '企业认证通过', content: '恭喜！您的企业「开物数迹科技有限公司」已通过平台认证审核。', isRead: false, createdAt: new Date(Date.now() - 3600000) },
        { receiverId: adminUser.id, type: 'task' as const, title: '新的投标申请', content: '王强申请了「数据分析报告」任务，报价 ¥8,000，预计 7 天完成。', isRead: false, createdAt: new Date(Date.now() - 3 * 3600000) },
        { receiverId: adminUser.id, type: 'system' as const, title: '发票开具完成', content: '发票 INV-2026-00001 已开具成功，金额 ¥12,000。', isRead: true, createdAt: new Date(Date.now() - 24 * 3600000) },
        { receiverId: adminUser.id, type: 'task' as const, title: '任务完成通知', content: '「视频后期剪辑」任务已由自由职业者标记为完成，请及时验收。', isRead: true, createdAt: new Date(Date.now() - 2 * 24 * 3600000) },
        { receiverId: adminUser.id, type: 'system' as const, title: '账户充值到账', content: '您的企业账户充值 ¥200,000.00 已到账，当前余额 ¥500,000.00。', isRead: true, createdAt: new Date(Date.now() - 3 * 24 * 3600000) },
    ];
    for (const m of msgs) {
        await prisma.message.create({ data: m });
    }
    console.log('✅ 6 条消息已创建');

    console.log('🎉 Phase 5 种子数据修复完成');
}

main().catch(console.error).finally(() => prisma.$disconnect());
