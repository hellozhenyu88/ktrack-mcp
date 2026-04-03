import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // 获取企业
    const enterprise = await prisma.enterprise.findFirst();
    if (!enterprise) { console.log('No enterprise found'); return; }

    // 1. 创建开票配置（如果不存在）
    const existingConfig = await prisma.invoiceConfig.findFirst({ where: { enterpriseId: enterprise.id } });
    if (!existingConfig) {
        await prisma.invoiceConfig.createMany({
            data: [
                { enterpriseId: enterprise.id, title: '开物数迹科技有限公司', taxNo: '91310000MA1ABCDE2F', bankName: '中国建设银行上海分行', bankAccount: '3100 1234 5678 0001', address: '上海市浦东新区世纪大道100号', phone: '021-12345678', isDefault: true },
                { enterpriseId: enterprise.id, title: '开物数迹科技有限公司（分公司）', taxNo: '91310000MA9XY12345', bankName: '招商银行上海支行', bankAccount: '6225 8888 1234 5678', address: '上海市徐汇区漕溪北路100号', phone: '021-87654321', isDefault: false },
            ],
        });
        console.log('✅ 开票配置已创建');
    }

    // 2. 创建资金流水（如果不存在）
    const existingFlows = await prisma.fundFlow.count({ where: { enterpriseId: enterprise.id } });
    if (existingFlows === 0) {
        await prisma.fundFlow.createMany({
            data: [
                { enterpriseId: enterprise.id, type: 'recharge', amount: 800000, balanceAfter: 800000, remark: '企业账户初始充值', createdAt: new Date('2026-01-15 10:00') },
                { enterpriseId: enterprise.id, type: 'escrow', amount: -45000, balanceAfter: 755000, remark: '任务托管：企业级 CRM 系统开发', createdAt: new Date('2026-01-20 14:30') },
                { enterpriseId: enterprise.id, type: 'payment', amount: -25000, balanceAfter: 730000, remark: '任务支付：小程序前端开发', createdAt: new Date('2026-02-05 09:15') },
                { enterpriseId: enterprise.id, type: 'escrow', amount: -15000, balanceAfter: 715000, remark: '任务托管：移动端 UI 设计', createdAt: new Date('2026-02-10 11:00') },
                { enterpriseId: enterprise.id, type: 'payment', amount: -12000, balanceAfter: 703000, remark: '任务支付：视频后期剪辑', createdAt: new Date('2026-02-15 16:30') },
                { enterpriseId: enterprise.id, type: 'fee', amount: -1200, balanceAfter: 701800, remark: '平台服务费（2月）', createdAt: new Date('2026-02-28 23:59') },
                { enterpriseId: enterprise.id, type: 'recharge', amount: 200000, balanceAfter: 901800, remark: '企业账户追加充值', createdAt: new Date('2026-03-01 10:00') },
                { enterpriseId: enterprise.id, type: 'escrow', amount: -8000, balanceAfter: 893800, remark: '任务托管：数据分析报告', createdAt: new Date('2026-03-03 15:20') },
                { enterpriseId: enterprise.id, type: 'payment', amount: -6000, balanceAfter: 887800, remark: '任务支付：API 接口联调', createdAt: new Date('2026-03-05 10:45') },
                { enterpriseId: enterprise.id, type: 'release', amount: 12000, balanceAfter: 899800, remark: '任务完成资金释放：视频后期剪辑', createdAt: new Date('2026-03-08 14:00') },
                { enterpriseId: enterprise.id, type: 'fee', amount: -600, balanceAfter: 899200, remark: '平台服务费', createdAt: new Date('2026-03-08 14:00') },
                { enterpriseId: enterprise.id, type: 'payment', amount: -20000, balanceAfter: 879200, remark: '任务支付：企业级 CRM 系统开发（阶段 1）', createdAt: new Date('2026-03-10 09:30') },
            ],
        });
        console.log('✅ 12 条资金流水已创建');
    }

    // 3. 创建发票记录（如果不存在）
    const existingInvoices = await prisma.invoice.count({ where: { enterpriseId: enterprise.id } });
    if (existingInvoices === 0) {
        const config = await prisma.invoiceConfig.findFirst({ where: { enterpriseId: enterprise.id, isDefault: true } });
        if (config) {
            const orders = await prisma.transactionOrder.findMany({ where: { enterpriseId: enterprise.id }, take: 3 });
            await prisma.invoice.createMany({
                data: [
                    { enterpriseId: enterprise.id, orderId: orders[0]?.id ?? null, amount: 12000, type: 'ordinary', title: config.title, taxNo: config.taxNo, status: 'issued', invoiceNo: 'INV-2026-00001', appliedAt: new Date('2026-02-20'), issuedAt: new Date('2026-02-22') },
                    { enterpriseId: enterprise.id, orderId: orders[1]?.id ?? null, amount: 25000, type: 'special', title: config.title, taxNo: config.taxNo, status: 'processing', appliedAt: new Date('2026-03-05') },
                    { enterpriseId: enterprise.id, orderId: orders[2]?.id ?? null, amount: 8000, type: 'ordinary', title: config.title, taxNo: config.taxNo, status: 'pending', appliedAt: new Date('2026-03-10') },
                ],
            });
            console.log('✅ 3 条发票记录已创建');
        }
    }

    console.log('🎉 Phase 4 种子数据完成');
}

main().catch(console.error).finally(() => prisma.$disconnect());
