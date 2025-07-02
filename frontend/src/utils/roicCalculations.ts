/**
 * ROIC計算ユーティリティ
 * 4つの計算方式に対応したROIC自動計算
 */

export interface FinancialData {
  // 損益計算書項目
  operatingIncome: number; // 営業利益
  interestIncome: number; // 受取利息
  taxRate: number; // 実効税率（0.0-1.0）
  
  // 貸借対照表項目
  totalAssets: number; // 総資産
  cashAndEquivalents: number; // 現金及び現金同等物
  shareholdersEquity: number; // 株主資本
  interestBearingDebt: number; // 有利子負債
  accountsPayable: number; // 買掛金
  accruedExpenses: number; // 未払金
  
  // IFRS16対応項目
  leaseExpense?: number; // リース費用
  leaseDebt?: number; // リース債務
}

export interface ROICResult {
  roic: number; // ROIC値（小数点形式 例: 0.15 = 15%）
  nopat: number; // 税引後営業利益
  investedCapital: number; // 投下資本
  calculationMethod: 'basic' | 'detailed' | 'asset' | 'modified';
  breakdown: {
    [key: string]: number;
  };
}

/**
 * 基本方式（財務指標直接計算）
 * 公式: ROIC = 営業利益 × (1 - 実効税率) ÷ (総資産 - 現金及び現金同等物)
 */
export function calculateBasicROIC(data: FinancialData): ROICResult {
  const nopat = data.operatingIncome * (1 - data.taxRate);
  const investedCapital = data.totalAssets - data.cashAndEquivalents;
  const roic = investedCapital > 0 ? nopat / investedCapital : 0;
  
  return {
    roic,
    nopat,
    investedCapital,
    calculationMethod: 'basic',
    breakdown: {
      '営業利益': data.operatingIncome,
      '税率': data.taxRate,
      'NOPAT': nopat,
      '総資産': data.totalAssets,
      '現金等': data.cashAndEquivalents,
      '投下資本': investedCapital
    }
  };
}

/**
 * 詳細方式（NOPAT個別計算）
 * 公式: NOPAT = (営業利益 + 受取利息) × (1 - 実効税率)
 *       投下資本 = 株主資本 + 有利子負債
 *       ROIC = NOPAT ÷ 投下資本
 */
export function calculateDetailedROIC(data: FinancialData): ROICResult {
  const adjustedOperatingIncome = data.operatingIncome + data.interestIncome;
  const nopat = adjustedOperatingIncome * (1 - data.taxRate);
  const investedCapital = data.shareholdersEquity + data.interestBearingDebt;
  const roic = investedCapital > 0 ? nopat / investedCapital : 0;
  
  return {
    roic,
    nopat,
    investedCapital,
    calculationMethod: 'detailed',
    breakdown: {
      '営業利益': data.operatingIncome,
      '受取利息': data.interestIncome,
      '調整営業利益': adjustedOperatingIncome,
      'NOPAT': nopat,
      '株主資本': data.shareholdersEquity,
      '有利子負債': data.interestBearingDebt,
      '投下資本': investedCapital
    }
  };
}

/**
 * アセット方式（総資産ベース）
 * 公式: 投下資本 = 総資産 - 無利子負債（買掛金、未払金等）
 *       ROIC = NOPAT ÷ 投下資本
 */
export function calculateAssetROIC(data: FinancialData): ROICResult {
  const adjustedOperatingIncome = data.operatingIncome + data.interestIncome;
  const nopat = adjustedOperatingIncome * (1 - data.taxRate);
  const nonInterestBearingLiabilities = data.accountsPayable + data.accruedExpenses;
  const investedCapital = data.totalAssets - nonInterestBearingLiabilities;
  const roic = investedCapital > 0 ? nopat / investedCapital : 0;
  
  return {
    roic,
    nopat,
    investedCapital,
    calculationMethod: 'asset',
    breakdown: {
      '営業利益': data.operatingIncome,
      '受取利息': data.interestIncome,
      'NOPAT': nopat,
      '総資産': data.totalAssets,
      '買掛金': data.accountsPayable,
      '未払金': data.accruedExpenses,
      '無利子負債': nonInterestBearingLiabilities,
      '投下資本': investedCapital
    }
  };
}

/**
 * 修正方式（リース調整）
 * 公式: 修正NOPAT = NOPAT + リース費用 × (1 - 実効税率)
 *       修正投下資本 = 投下資本 + リース債務
 *       修正ROIC = 修正NOPAT ÷ 修正投下資本
 */
export function calculateModifiedROIC(data: FinancialData): ROICResult {
  // ベースとして詳細方式を使用
  const baseResult = calculateDetailedROIC(data);
  
  const leaseExpense = data.leaseExpense || 0;
  const leaseDebt = data.leaseDebt || 0;
  
  const modifiedNopat = baseResult.nopat + (leaseExpense * (1 - data.taxRate));
  const modifiedInvestedCapital = baseResult.investedCapital + leaseDebt;
  const roic = modifiedInvestedCapital > 0 ? modifiedNopat / modifiedInvestedCapital : 0;
  
  return {
    roic,
    nopat: modifiedNopat,
    investedCapital: modifiedInvestedCapital,
    calculationMethod: 'modified',
    breakdown: {
      ...baseResult.breakdown,
      'リース費用': leaseExpense,
      'リース債務': leaseDebt,
      '修正NOPAT': modifiedNopat,
      '修正投下資本': modifiedInvestedCapital
    }
  };
}

/**
 * 全ての計算方式でROICを計算
 */
export function calculateAllROIC(data: FinancialData): {
  basic: ROICResult;
  detailed: ROICResult;
  asset: ROICResult;
  modified: ROICResult;
} {
  return {
    basic: calculateBasicROIC(data),
    detailed: calculateDetailedROIC(data),
    asset: calculateAssetROIC(data),
    modified: calculateModifiedROIC(data)
  };
}

/**
 * ROIC値を百分率で表示するためのフォーマット
 */
export function formatROIC(roic: number): string {
  return `${(roic * 100).toFixed(2)}%`;
}

/**
 * 数値を千円単位でフォーマット
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0
  }).format(amount * 1000); // 千円単位想定
}

/**
 * サンプル企業データ（テスト用）
 */
export const sampleCompanyData: FinancialData = {
  operatingIncome: 150000, // 1,500億円
  interestIncome: 5000,    // 50億円
  taxRate: 0.30,           // 30%
  totalAssets: 2000000,    // 2兆円
  cashAndEquivalents: 200000, // 2,000億円
  shareholdersEquity: 800000,  // 8,000億円
  interestBearingDebt: 400000, // 4,000億円
  accountsPayable: 100000,     // 1,000億円
  accruedExpenses: 50000,      // 500億円
  leaseExpense: 20000,         // 200億円
  leaseDebt: 180000            // 1,800億円
};

/**
 * ROIC評価レベルを取得
 */
export function getROICEvaluationLevel(roic: number): {
  level: 'excellent' | 'good' | 'average' | 'poor';
  description: string;
  color: string;
} {
  if (roic >= 0.15) {
    return {
      level: 'excellent',
      description: '優秀（15%以上）',
      color: 'text-green-600'
    };
  } else if (roic >= 0.10) {
    return {
      level: 'good',
      description: '良好（10-15%）',
      color: 'text-blue-600'
    };
  } else if (roic >= 0.05) {
    return {
      level: 'average',
      description: '平均的（5-10%）',
      color: 'text-yellow-600'
    };
  } else {
    return {
      level: 'poor',
      description: '要改善（5%未満）',
      color: 'text-red-600'
    };
  }
}