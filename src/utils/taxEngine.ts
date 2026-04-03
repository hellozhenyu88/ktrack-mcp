/**
 * 2025年税务新政：累计预扣法计税引擎
 * 适配：劳务报酬所得（连续劳务）
 */

export interface TaxCalculationResult {
  pretaxAmount: number;      // 税前总额
  platformFee: number;      // 平台服务费
  taxableIncome: number;    // 应纳税所得额
  taxAmount: number;        // 本期预扣预缴税额
  vatAmount: number;        // 增值税及附加 (月入>10万触发)
  netAmount: number;        // 实发金额 (净收入)
  cumulativeIncome: number; // 当年累计收入
  continuousMonths: number; // 连续工作月份
  deductionAmount: number;  // 累计减除费用 (5000 * N)
}

/**
 * 劳务报酬预扣率表 (累计预扣法适用)
 */
const TAX_BRACKETS = [
  { limit: 36000, rate: 0.03, deduction: 0 },
  { limit: 144000, rate: 0.10, deduction: 2520 },
  { limit: 300000, rate: 0.20, deduction: 16920 },
  { limit: 420000, rate: 0.25, deduction: 31920 },
  { limit: 660000, rate: 0.30, deduction: 52920 },
  { limit: 960000, rate: 0.35, deduction: 85920 },
  { limit: Infinity, rate: 0.45, deduction: 181920 },
];

/**
 * 计算个税 (累计预扣法)
 * 公式：本期应预扣预缴税额 = (累计收入 - 累计费用 - 累计免税收入 - 累计减除费用) × 预扣率 - 速算扣除数 - 累计已预扣预缴税额
 */
export function calculateTax(
  currentAmount: number,
  previousCumulativeIncome: number,
  previousCumulativeTax: number,
  continuousMonths: number,
  monthlyTotalIncome: number // 用于判断增值税
): TaxCalculationResult {
  const PLATFORM_FEE_RATE = 0.10; // 假设平台费 10%
  const platformFee = currentAmount * PLATFORM_FEE_RATE;
  
  const cumulativeIncome = previousCumulativeIncome + currentAmount;
  
  // 1. 累计费用：累计收入 * 20%
  const cumulativeExpenses = cumulativeIncome * 0.20;
  
  // 2. 累计减除费用：5000 * 连续月份
  const deductionAmount = 5000 * continuousMonths;
  
  // 3. 累计应纳税所得额
  const cumulativeTaxableIncome = Math.max(0, cumulativeIncome - cumulativeExpenses - deductionAmount);
  
  // 4. 计算累计应纳税额
  let bracket = TAX_BRACKETS.find(b => cumulativeTaxableIncome <= b.limit) || TAX_BRACKETS[TAX_BRACKETS.length - 1];
  const totalCumulativeTax = (cumulativeTaxableIncome * bracket.rate) - bracket.deduction;
  
  // 5. 本期应预扣个税
  const taxAmount = Math.max(0, totalCumulativeTax - previousCumulativeTax);
  
  // 6. 增值税 (月收入 > 10万触发 1% 征收率)
  let vatAmount = 0;
  if (monthlyTotalIncome > 100000) {
    vatAmount = currentAmount * 0.01; // 简化计算
  }
  
  const netAmount = currentAmount - platformFee - taxAmount - vatAmount;
  
  return {
    pretaxAmount: currentAmount,
    platformFee,
    taxableIncome: cumulativeTaxableIncome,
    taxAmount,
    vatAmount,
    netAmount,
    cumulativeIncome,
    continuousMonths,
    deductionAmount
  };
}

/**
 * 年度汇算清缴计算 (预估)
 * 年度应纳税额 = (年度收入 - 年度费用 - 年度免税收入 - 年度减除费用 - 专项扣除 - 专项附加扣除 - 依法确定的其他扣除) × 税率 - 速算扣除数
 */
export function calculateAnnualSettlement(
  totalIncome: number,
  totalTaxPaid: number,
  specialDeductions: number = 0, // 专项附加扣除 (如房租、子女教育等)
  continuousMonths: number = 12
) {
  const annualExpenses = totalIncome * 0.20;
  const annualDeduction = 5000 * continuousMonths;
  
  const taxableIncome = Math.max(0, totalIncome - annualExpenses - annualDeduction - specialDeductions);
  
  const bracket = TAX_BRACKETS.find(b => taxableIncome <= b.limit) || TAX_BRACKETS[TAX_BRACKETS.length - 1];
  const annualTax = (taxableIncome * bracket.rate) - bracket.deduction;
  
  const refundOrPayment = totalTaxPaid - annualTax;
  
  return {
    totalIncome,
    taxableIncome,
    annualTax,
    totalTaxPaid,
    refundOrPayment, // 正数为退税，负数为补税
  };
}
