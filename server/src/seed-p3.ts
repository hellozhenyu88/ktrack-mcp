/**
 * Phase 3 种子数据：添加自由职业者用户 + 更多交易订单
 * 运行：tsx src/seed-p3.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Phase 3 种子数据填充...');

    // 1. 创建自由职业者用户
    const freelancers = [
        { phone: '13900001001', displayName: '张小凡', role: 'freelancer' as const },
        { phone: '13900001002', displayName: '李梅', role: 'freelancer' as const },
        { phone: '13900001003', displayName: '王强', role: 'freelancer' as const },
        { phone: '13900001004', displayName: '赵丽', role: 'freelancer' as const },
        { phone: '13900001005', displayName: '陈明', role: 'freelancer' as const },
        { phone: '13900001006', displayName: '周婷', role: 'freelancer' as const },
        { phone: '13900001007', displayName: '刘畅', role: 'freelancer' as const },
        { phone: '13900001008', displayName: '孙悦', role: 'freelancer' as const },
    ];

    for (const f of freelancers) {
        await prisma.user.upsert({
            where: { phone: f.phone },
            update: {},
            create: { ...f, status: 'active' },
        });
    }
    console.log(`✅ 已创建 ${freelancers.length} 个自由职业者`);

    // 2. 获取企业信息
    const enterprise = await prisma.enterprise.findFirst({ where: { companyName: { contains: '开物数迹' } } });
    if (!enterprise) {
        console.error('❌ 未找到企业，请先运行 seed.ts');
        return;
    }

    // 3. 获取已有任务（确保 taskId 正确）
    const tasks = await prisma.task.findMany({ where: { enterpriseId: enterprise.id }, orderBy: { id: 'asc' } });

    // 4. 为每个任务创建交易订单（如果还没有）
    const orderData = [
        { taskIdx: 0, totalAmount: 45000, platformFee: 2250, taxAmount: 1350, netAmount: 41400, status: 'in_progress' as const },
        { taskIdx: 1, totalAmount: 15000, platformFee: 750, taxAmount: 450, netAmount: 13800, status: 'escrowed' as const },
        { taskIdx: 2, totalAmount: 8000, platformFee: 400, taxAmount: 240, netAmount: 7360, status: 'pending_acceptance' as const },
        { taskIdx: 3, totalAmount: 6000, platformFee: 300, taxAmount: 180, netAmount: 5520, status: 'completed' as const },
        { taskIdx: 4, totalAmount: 25000, platformFee: 1250, taxAmount: 750, netAmount: 22500, status: 'escrowed' as const },
        { taskIdx: 5, totalAmount: 12000, platformFee: 600, taxAmount: 360, netAmount: 11040, status: 'in_progress' as const },
    ];

    let orderCount = 0;
    for (const od of orderData) {
        if (!tasks[od.taskIdx]) continue;
        const existing = await prisma.transactionOrder.findUnique({ where: { taskId: tasks[od.taskIdx].id } });
        if (existing) continue;

        await prisma.transactionOrder.create({
            data: {
                orderNo: `KT${Date.now()}${od.taskIdx}`,
                taskId: tasks[od.taskIdx].id,
                enterpriseId: enterprise.id,
                totalAmount: od.totalAmount,
                platformFee: od.platformFee,
                taxAmount: od.taxAmount,
                netAmount: od.netAmount,
                status: od.status,
            },
        });
        orderCount++;
    }
    console.log(`✅ 新增 ${orderCount} 个交易订单`);

    // 5. 添加人才池收藏
    const allFreelancers = await prisma.user.findMany({ where: { role: 'freelancer' }, take: 3 });
    for (const fl of allFreelancers) {
        await prisma.talentPool.upsert({
            where: { enterpriseId_freelancerId: { enterpriseId: enterprise.id, freelancerId: fl.id } },
            update: {},
            create: {
                enterpriseId: enterprise.id,
                freelancerId: fl.id,
                tag: 'cooperated',
                note: '之前项目合作过',
            },
        });
    }
    console.log('✅ 人才池已初始化');

    // 6. 添加交易操作日志
    const orders = await prisma.transactionOrder.findMany({ where: { enterpriseId: enterprise.id } });
    const adminUser = await prisma.user.findFirst({ where: { role: 'enterprise' } });
    if (adminUser) {
        for (const order of orders) {
            const existingLogs = await prisma.transactionLog.count({ where: { orderId: order.id } });
            if (existingLogs > 0) continue;

            await prisma.transactionLog.create({
                data: {
                    orderId: order.id,
                    action: '订单创建',
                    operatorId: adminUser.id,
                    remark: `订单 ${order.orderNo} 已创建`,
                },
            });

            if (['escrowed', 'in_progress', 'pending_acceptance', 'completed'].includes(order.status)) {
                await prisma.transactionLog.create({
                    data: {
                        orderId: order.id,
                        action: '企业支付',
                        operatorId: adminUser.id,
                        remark: `已支付 ¥${order.totalAmount} 至平台托管账户`,
                    },
                });
            }
        }
        console.log('✅ 交易日志已创建');
    }

    console.log('\n🎉 Phase 3 种子数据填充完成！');
}

main()
    .catch((e) => { console.error('❌ 失败:', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
