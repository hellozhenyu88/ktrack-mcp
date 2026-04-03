/**
 * 数据库种子数据脚本
 * 运行：npx tsx src/seed.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 开始填充种子数据...');

    // 1. 创建企业用户
    const user = await prisma.user.upsert({
        where: { phone: '13800138000' },
        update: {},
        create: {
            phone: '13800138000',
            displayName: '企业管理员',
            role: 'enterprise',
            status: 'active',
        },
    });
    console.log(`✅ 用户: ${user.phone} (ID: ${user.id})`);

    // 2. 创建企业
    const enterprise = await prisma.enterprise.upsert({
        where: { userId: user.id },
        update: {},
        create: {
            userId: user.id,
            companyName: '开物数迹科技有限公司',
            licenseNo: '91110105MA01XXXX',
            contactPerson: '张总',
            contactPhone: '13800138000',
            address: '北京市朝阳区科技园区',
            status: 'verified',
        },
    });
    console.log(`✅ 企业: ${enterprise.companyName} (ID: ${enterprise.id})`);

    // 3. 创建企业账户
    await prisma.enterpriseAccount.upsert({
        where: { enterpriseId: enterprise.id },
        update: {},
        create: {
            enterpriseId: enterprise.id,
            balance: 500000,
            frozenAmount: 68000,
            totalRecharged: 800000,
            totalSpent: 232000,
        },
    });
    console.log('✅ 企业账户已创建');

    // 4. 创建示例任务
    const tasks = [
        { name: '企业级 CRM 系统开发', type: '软件开发', description: '需要开发一套完整的客户关系管理系统，包含客户管理、销售跟踪、数据分析模块。', requirements: ['React', 'Node.js', 'MySQL'], peopleNeeded: 3, budget: 45000, duration: '2个月', location: '上海', status: 'in_progress' as const, aiGenerated: true, appliedCount: 8, confirmedCount: 3 },
        { name: '移动端 UI 设计', type: 'UI设计', description: '为公司核心产品设计移动端界面，需要提供完整的设计稿和切图。', requirements: ['Figma', 'Sketch', 'Adobe XD'], peopleNeeded: 1, budget: 15000, duration: '2周', location: '远程', status: 'open' as const, aiGenerated: false, appliedCount: 12, confirmedCount: 0 },
        { name: '数据分析报告', type: '数据分析', description: '对公司Q1业务数据进行深度分析，输出可视化报告和建议方案。', requirements: ['Python', 'SQL', 'Tableau'], peopleNeeded: 1, budget: 8000, duration: '1周', location: '北京', status: 'waiting_confirmation' as const, aiGenerated: true, appliedCount: 5, confirmedCount: 1 },
        { name: '市场推广文案', type: '文案策划', description: '为新产品上线准备全套营销文案，包括公众号文章、朋友圈素材、产品详情页。', requirements: ['文案', '营销', '新媒体'], peopleNeeded: 2, budget: 6000, duration: '3天', location: '远程', status: 'completed' as const, aiGenerated: false, appliedCount: 15, confirmedCount: 2 },
        { name: '小程序前端开发', type: '软件开发', description: '开发微信小程序，连接后端API，实现用户注册、任务浏览、在线沟通等功能。', requirements: ['微信小程序', 'TypeScript', 'WeUI'], peopleNeeded: 2, budget: 25000, duration: '1个月', location: '深圳', status: 'open' as const, aiGenerated: true, appliedCount: 6, confirmedCount: 0 },
        { name: '视频后期剪辑', type: '视频制作', description: '公司品牌宣传片的后期剪辑和特效制作。', requirements: ['Premiere Pro', 'After Effects'], peopleNeeded: 1, budget: 12000, duration: '2周', location: '远程', status: 'in_progress' as const, aiGenerated: false, appliedCount: 9, confirmedCount: 1 },
    ];

    for (const task of tasks) {
        await prisma.task.create({
            data: {
                enterpriseId: enterprise.id,
                ...task,
            },
        });
    }
    console.log(`✅ 已创建 ${tasks.length} 个示例任务`);

    // 5. 创建开票配置
    await prisma.invoiceConfig.create({
        data: {
            enterpriseId: enterprise.id,
            title: '开物数迹科技有限公司',
            taxNo: '91110105MA01XXXX',
            bankName: '中国工商银行北京朝阳支行',
            bankAccount: '0200 0012 0900 1234567',
            address: '北京市朝阳区科技园区A座301',
            phone: '010-12345678',
            isDefault: true,
        },
    });
    console.log('✅ 开票配置已创建');

    // 6. 创建示例交易订单
    await prisma.transactionOrder.create({
        data: {
            orderNo: `KT${Date.now()}`,
            taskId: 1,
            enterpriseId: enterprise.id,
            totalAmount: 45000,
            platformFee: 2250,
            taxAmount: 1350,
            netAmount: 41400,
            status: 'in_progress',
        },
    });
    console.log('✅ 示例交易订单已创建');

    // 7. 创建资金流水
    const flows = [
        { type: 'recharge' as const, amount: 500000, balanceAfter: 500000, remark: '企业账户首次充值' },
        { type: 'escrow' as const, amount: -45000, balanceAfter: 455000, remark: 'CRM系统开发任务资金托管' },
        { type: 'recharge' as const, amount: 300000, balanceAfter: 755000, remark: '第二次充值' },
        { type: 'payment' as const, amount: -6000, balanceAfter: 749000, remark: '市场推广文案结算' },
        { type: 'escrow' as const, amount: -25000, balanceAfter: 724000, remark: '小程序开发资金托管' },
    ];

    for (const flow of flows) {
        await prisma.fundFlow.create({
            data: { enterpriseId: enterprise.id, ...flow },
        });
    }
    console.log('✅ 资金流水已创建');

    // 8. 创建角色和成员
    const role = await prisma.role.create({
        data: {
            enterpriseId: enterprise.id,
            name: '超级管理员',
            permissions: { all: true },
        },
    });

    await prisma.enterpriseMember.create({
        data: {
            enterpriseId: enterprise.id,
            userId: user.id,
            roleId: role.id,
            status: 'active',
        },
    });
    console.log('✅ 角色和成员已创建');

    console.log('\n🎉 种子数据填充完成！');
}

main()
    .catch((e) => {
        console.error('❌ 种子数据填充失败:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
