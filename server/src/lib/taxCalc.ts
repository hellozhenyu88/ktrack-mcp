/**
 * 连续劳务报酬累计预扣预缴税金计算
 * 
 * 支持两种模式：
 * 1. individual（增值税个人承担）：增值税+附加税+个税从订单金额中扣除
 * 2. enterprise（增值税企业承担）：劳动者获得全额，企业额外支付税费
 * 
 * 公式:
 * 本月应预扣个人所得税 = (累计收入额 - 累计增值税 - 累计费用 - 累计减除费用) × 适用税率 - 速算扣除数 - 累计已预扣个人所得税
 * 累计费用 = 每月(不含增值税收入 × 20%)四舍五入后依次相加
 * 
 * 增值税(预估) = 收入 / (1+1%) × 1%
 * 城建税(预估) = 增值税 × 7%
 * 教育费附加(预估) = 增值税 × 3%
 * 地方教育费附加(预估) = 增值税 × 2%
 */

const R2 = (v: number) => Math.round(v * 100) / 100;

// 个人所得税综合所得预扣率表
const TAX_BRACKETS = [
    { limit: 36000,    rate: 0.03, deduction: 0 },
    { limit: 144000,   rate: 0.10, deduction: 2520 },
    { limit: 300000,   rate: 0.20, deduction: 16920 },
    { limit: 420000,   rate: 0.25, deduction: 31920 },
    { limit: 660000,   rate: 0.30, deduction: 52920 },
    { limit: 960000,   rate: 0.35, deduction: 85920 },
    { limit: Infinity, rate: 0.45, deduction: 181920 },
];

// 增值税税率
const VAT_RATE = 0.01; // 1%

// 附加税率
const CITY_TAX_RATE = 0.07;      // 城建税 7%
const EDU_SURCHARGE_RATE = 0.03;  // 教育费附加 3%
const LOCAL_EDU_RATE = 0.02;      // 地方教育费附加 2%

// 平台服务费率
export const PLATFORM_FEE_RATE = 0.06; // 6%

// 每月减除费用
const MONTHLY_DEDUCTION = 5000;

/**
 * 计算累计预扣税额
 */
function calcCumulativeTax(taxableIncome: number): number {
    if (taxableIncome <= 0) return 0;
    const bracket = TAX_BRACKETS.find(b => taxableIncome <= b.limit) || TAX_BRACKETS[TAX_BRACKETS.length - 1];
    return R2(taxableIncome * bracket.rate - bracket.deduction);
}

export type TaxModeType = 'individual' | 'enterprise';

export interface PreviousOrder {
    totalAmount: number;
    taxAmount: number;
    monthIndex: number;
}

/** 原始订单（含日期），用于按自然月分组 */
export interface RawOrder {
    totalAmount: number;
    taxAmount: number;
    createdAt: Date;
}

/**
 * 将原始订单按自然月（YYYY-MM）分组，生成 PreviousOrder[] 供税金计算使用。
 * - 同一个月多笔订单 → 合并收入和税额
 * - 月份间如有空白 → 月序号按实际自然月递增，不连续（影响累计减除费用）
 * 
 * @param rawOrders 按 createdAt 升序排列的历史订单
 * @param currentDate 当前订单日期（用于计算当前月序号）
 * @returns { previousOrders: PreviousOrder[], currentMonthIndex: number }
 */
export function groupOrdersByMonth(
    rawOrders: RawOrder[],
    currentDate: Date = new Date()
): { previousOrders: PreviousOrder[]; currentMonthIndex: number } {
    if (rawOrders.length === 0) {
        return { previousOrders: [], currentMonthIndex: 1 };
    }

    // 按 YYYY-MM 分组
    const monthMap = new Map<string, { totalAmount: number; taxAmount: number }>();
    for (const o of rawOrders) {
        const key = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, '0')}`;
        const existing = monthMap.get(key);
        if (existing) {
            existing.totalAmount += o.totalAmount;
            existing.taxAmount += o.taxAmount;
        } else {
            monthMap.set(key, { totalAmount: o.totalAmount, taxAmount: o.taxAmount });
        }
    }

    // 找到最早月份作为基准（月序号=1）
    const firstOrder = rawOrders[0];
    const baseYear = firstOrder.createdAt.getFullYear();
    const baseMonth = firstOrder.createdAt.getMonth(); // 0-indexed

    // 计算某个日期相对于基准的月序号
    const getMonthIndex = (d: Date) => {
        return (d.getFullYear() - baseYear) * 12 + (d.getMonth() - baseMonth) + 1;
    };

    // 构造 PreviousOrder[]
    const previousOrders: PreviousOrder[] = [];
    for (const [key, data] of monthMap) {
        const [y, m] = key.split('-').map(Number);
        const monthDate = new Date(y, m - 1, 1);
        previousOrders.push({
            totalAmount: data.totalAmount,
            taxAmount: data.taxAmount,
            monthIndex: getMonthIndex(monthDate),
        });
    }
    previousOrders.sort((a, b) => a.monthIndex - b.monthIndex);

    const currentMonthIndex = getMonthIndex(currentDate);

    return { previousOrders, currentMonthIndex };
}

export interface TaxCalcResult {
    taxMode: TaxModeType;
    totalAmount: number;      // 订单金额（劳务报酬）
    vatAmount: number;        // 增值税
    cityTax: number;          // 城建税
    eduSurcharge: number;     // 教育费附加
    localEduSurcharge: number; // 地方教育费附加
    surchargeTotal: number;   // 附加税合计
    vatAndSurcharge: number;  // 增值税+附加税合计
    incomeExVat: number;      // 不含增值税收入
    costDeduction: number;    // 本笔费用扣除
    platformFee: number;      // 平台服务费
    taxAmount: number;        // 本笔应预扣个税
    netAmount: number;        // 劳动者实收金额
    enterpriseCost: number;   // 企业实际支出
    // 累计明细
    cumIncome: number;
    cumVat: number;
    cumCost: number;
    cumDeduction: number;
    cumTax: number;
    monthCount: number;
}

/**
 * 计算本笔订单的个人所得税（连续劳务报酬累计预扣法）
 * 
 * @param totalAmount     本笔订单金额（劳务报酬）
 * @param previousOrders  连续月份内之前所有已完成订单
 * @param taxMode         'individual' | 'enterprise'
 * @returns TaxCalcResult
 */
export function calculateLaborTax(
    totalAmount: number,
    previousOrders: PreviousOrder[],
    taxMode: TaxModeType = 'individual',
    options?: { currentMonthIndex?: number }
): TaxCalcResult {
    // 1. 计算增值税及附加税（月收入≤10万免征增值税）
    const vatAmount = totalAmount <= 100000 ? 0 : R2(totalAmount / (1 + VAT_RATE) * VAT_RATE);
    const incomeExVat = R2(totalAmount - vatAmount);
    const cityTax = R2(vatAmount * CITY_TAX_RATE);
    const eduSurcharge = R2(vatAmount * EDU_SURCHARGE_RATE);
    const localEduSurcharge = R2(vatAmount * LOCAL_EDU_RATE);
    const surchargeTotal = R2(cityTax + eduSurcharge + localEduSurcharge);
    const vatAndSurcharge = R2(vatAmount + surchargeTotal);

    // 2. 计算累计之前的值
    let cumIncomePrev = 0;
    let cumVatPrev = 0;
    let cumCostPrev = 0;
    let cumTaxPrev = 0;
    let prevMonthCount = 0;

    for (const order of previousOrders) {
        const orderVat = order.totalAmount <= 100000 ? 0 : R2(order.totalAmount / (1 + VAT_RATE) * VAT_RATE);
        const orderIncomeExVat = R2(order.totalAmount - orderVat);
        const orderCost = R2(orderIncomeExVat * 0.2);

        cumIncomePrev += order.totalAmount;
        cumVatPrev += orderVat;
        cumCostPrev += orderCost;
        cumTaxPrev += order.taxAmount;
        prevMonthCount = Math.max(prevMonthCount, order.monthIndex);
    }

    // 3. 本笔的费用扣除
    const costDeduction = R2(incomeExVat * 0.2);

    // 4. 当前月序号（如果调用方通过 overrideCurrentMonthIndex 指定则使用它）
    const currentMonthIndex = (options?.currentMonthIndex) || (prevMonthCount + 1);

    // 5. 累计值（含本笔）
    const cumIncome = R2(cumIncomePrev + totalAmount);
    const cumVat = R2(cumVatPrev + vatAmount);
    const cumCost = R2(cumCostPrev + costDeduction);
    const cumDeduction = R2(MONTHLY_DEDUCTION * currentMonthIndex);

    // 6. 累计应纳税所得额
    const taxableIncome = R2(cumIncome - cumVat - cumCost - cumDeduction);

    // 7. 累计应预扣税额
    const cumTaxTotal = calcCumulativeTax(taxableIncome);

    // 8. 本笔应预扣个税
    const taxAmount = R2(Math.max(0, cumTaxTotal - cumTaxPrev));

    // 9. 平台服务费
    const platformFee = R2(totalAmount * PLATFORM_FEE_RATE);

    // 10. 根据模式计算实收和企业支出
    let netAmount: number;
    let enterpriseCost: number;

    if (taxMode === 'enterprise') {
        // 企业承担：劳动者全额到手，企业额外支付税费
        netAmount = R2(totalAmount - platformFee);
        enterpriseCost = R2(totalAmount + vatAndSurcharge + taxAmount);
    } else {
        // 个人承担：从订单金额中扣除税费
        netAmount = R2(totalAmount - vatAndSurcharge - taxAmount - platformFee);
        enterpriseCost = totalAmount;
    }

    return {
        taxMode,
        totalAmount,
        vatAmount,
        cityTax,
        eduSurcharge,
        localEduSurcharge,
        surchargeTotal,
        vatAndSurcharge,
        incomeExVat,
        costDeduction,
        platformFee,
        taxAmount,
        netAmount,
        enterpriseCost,
        cumIncome,
        cumVat,
        cumCost,
        cumDeduction,
        cumTax: R2(cumTaxPrev + taxAmount),
        monthCount: currentMonthIndex,
    };
}
