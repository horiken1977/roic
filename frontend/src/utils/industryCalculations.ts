/**
 * 業界別ROIC計算・比較ユーティリティ
 * Industry-specific ROIC calculation and comparison utilities
 */

// Industry master data type definition
interface IndustryMasterData {
  industries: Array<{
    industry_code: string;
    industry_name: string;
    sub_categories: IndustryData[];
  }>;
}

// Import industry master data with fallback for CI environments
let industryMaster: IndustryMasterData;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  industryMaster = require('../../../data/industry-master.json') as IndustryMasterData;
} catch {
  // Fallback data for CI environments
  industryMaster = {
    industries: [
      {
        industry_code: '1000',
        industry_name: '製造業',
        sub_categories: [
          {
            industry_code: '1100',
            industry_name: '自動車・輸送機器',
            parent_category: '製造業',
            roic_adjustment: { coefficient: 0.95, reason: '設備集約型産業調整' },
            representative_companies: [
              { name: 'トヨタ自動車', code: '7203' },
              { name: 'ホンダ', code: '7267' },
              { name: '日産自動車', code: '7201' }
            ],
            characteristics: {
              capital_intensity: '高',
              r_and_d_intensity: '高',
              working_capital_turnover: '中',
              typical_roic_range: '8-15%'
            }
          },
          {
            industry_code: '1200',
            industry_name: '電気機器',
            parent_category: '製造業',
            roic_adjustment: { coefficient: 1.02, reason: '技術革新プレミアム' },
            representative_companies: [
              { name: 'ソニーグループ', code: '6758' },
              { name: 'キーエンス', code: '6861' },
              { name: 'パナソニック', code: '6752' }
            ],
            characteristics: {
              capital_intensity: '中',
              r_and_d_intensity: '高',
              working_capital_turnover: '高',
              typical_roic_range: '12-25%'
            }
          }
        ]
      },
      {
        industry_code: '2000',
        industry_name: '金融業',
        sub_categories: [
          {
            industry_code: '2100',
            industry_name: '銀行業',
            parent_category: '金融業',
            roic_adjustment: { coefficient: 0.85, reason: '規制業種調整' },
            representative_companies: [
              { name: '三菱UFJフィナンシャル・グループ', code: '8306' },
              { name: '三井住友フィナンシャルグループ', code: '8316' },
              { name: 'みずほフィナンシャルグループ', code: '8411' }
            ],
            characteristics: {
              capital_intensity: '低',
              r_and_d_intensity: '低',
              working_capital_turnover: '高',
              typical_roic_range: '5-12%'
            }
          }
        ]
      },
      {
        industry_code: '3000',
        industry_name: 'サービス業',
        sub_categories: [
          {
            industry_code: '3100',
            industry_name: '小売業',
            parent_category: 'サービス業',
            roic_adjustment: { coefficient: 1.05, reason: '運転資本効率性' },
            representative_companies: [
              { name: 'ファーストリテイリング', code: '9983' },
              { name: 'セブン＆アイ・ホールディングス', code: '3382' },
              { name: 'イオン', code: '8267' }
            ],
            characteristics: {
              capital_intensity: '中',
              r_and_d_intensity: '低',
              working_capital_turnover: '高',
              typical_roic_range: '15-30%'
            }
          }
        ]
      },
      {
        industry_code: '4000',
        industry_name: '情報・通信業',
        sub_categories: [
          {
            industry_code: '4100',
            industry_name: '情報・通信業',
            parent_category: '情報・通信業',
            roic_adjustment: { coefficient: 1.10, reason: 'デジタル変革プレミアム' },
            representative_companies: [
              { name: 'ソフトバンクグループ', code: '9984' },
              { name: 'NTT', code: '9432' },
              { name: 'KDDI', code: '9433' }
            ],
            characteristics: {
              capital_intensity: '中',
              r_and_d_intensity: '高',
              working_capital_turnover: '高',
              typical_roic_range: '10-20%'
            }
          }
        ]
      }
    ]
  };
}

export interface IndustryData {
  industry_code: string;
  industry_name: string;
  parent_category: string;
  roic_adjustment: {
    coefficient: number;
    reason: string;
    [key: string]: string | number | boolean;
  };
  representative_companies: Array<{
    name: string;
    code: string;
  }>;
  characteristics: {
    capital_intensity: string;
    r_and_d_intensity: string;
    working_capital_turnover: string;
    typical_roic_range: string;
  };
}

export interface CompanyROICData {
  company_code: string;
  company_name: string;
  industry_code: string;
  roic_value: number;
  calculation_method: string;
  fiscal_year: string;
}

export interface IndustryComparison {
  industry_code: string;
  industry_name: string;
  companies: CompanyROICData[];
  statistics: {
    average_roic: number;
    median_roic: number;
    max_roic: number;
    min_roic: number;
    quartiles: {
      q1: number;
      q2: number;
      q3: number;
    };
  };
}

/**
 * 業界データを取得
 */
export function getIndustryData(industryCode: string): IndustryData | null {
  for (const industry of industryMaster.industries) {
    for (const subCategory of industry.sub_categories) {
      if (subCategory.industry_code === industryCode) {
        return subCategory as IndustryData;
      }
    }
  }
  return null;
}

/**
 * 全業界リストを取得
 */
export function getAllIndustries(): IndustryData[] {
  const allIndustries: IndustryData[] = [];
  
  for (const industry of industryMaster.industries) {
    for (const subCategory of industry.sub_categories) {
      allIndustries.push(subCategory as IndustryData);
    }
  }
  
  return allIndustries;
}

/**
 * 業界別ROIC調整係数を適用
 */
export function applyIndustryAdjustment(
  baseROIC: number, 
  industryCode: string
): number {
  const industryData = getIndustryData(industryCode);
  
  if (!industryData || industryData.roic_adjustment.coefficient === 0) {
    return baseROIC;
  }
  
  return baseROIC * industryData.roic_adjustment.coefficient;
}

/**
 * 業界内順位を計算
 */
export function calculateIndustryRanking(
  companyROIC: number,
  industryComparison: IndustryComparison
): {
  rank: number;
  totalCompanies: number;
  percentile: number;
  quartile: 'top' | 'upper_middle' | 'lower_middle' | 'bottom';
} {
  const sortedROICs = industryComparison.companies
    .map(c => c.roic_value)
    .sort((a, b) => b - a);
  
  const rank = sortedROICs.findIndex(roic => roic <= companyROIC) + 1;
  const totalCompanies = sortedROICs.length;
  const percentile = ((totalCompanies - rank + 1) / totalCompanies) * 100;
  
  let quartile: 'top' | 'upper_middle' | 'lower_middle' | 'bottom';
  if (percentile >= 75) quartile = 'top';
  else if (percentile >= 50) quartile = 'upper_middle';
  else if (percentile >= 25) quartile = 'lower_middle';
  else quartile = 'bottom';
  
  return {
    rank,
    totalCompanies,
    percentile: Math.round(percentile * 10) / 10,
    quartile
  };
}

/**
 * 業界統計を計算
 */
export function calculateIndustryStatistics(
  companies: CompanyROICData[]
): IndustryComparison['statistics'] {
  if (companies.length === 0) {
    return {
      average_roic: 0,
      median_roic: 0,
      max_roic: 0,
      min_roic: 0,
      quartiles: { q1: 0, q2: 0, q3: 0 }
    };
  }
  
  const roicValues = companies.map(c => c.roic_value).sort((a, b) => a - b);
  const length = roicValues.length;
  
  // 基本統計
  const average_roic = roicValues.reduce((sum, val) => sum + val, 0) / length;
  const median_roic = length % 2 === 0 
    ? (roicValues[length / 2 - 1] + roicValues[length / 2]) / 2
    : roicValues[Math.floor(length / 2)];
  const max_roic = Math.max(...roicValues);
  const min_roic = Math.min(...roicValues);
  
  // 四分位数
  const q1Index = Math.floor(length * 0.25);
  const q2Index = Math.floor(length * 0.5);
  const q3Index = Math.floor(length * 0.75);
  
  return {
    average_roic: Math.round(average_roic * 1000) / 1000,
    median_roic: Math.round(median_roic * 1000) / 1000,
    max_roic: Math.round(max_roic * 1000) / 1000,
    min_roic: Math.round(min_roic * 1000) / 1000,
    quartiles: {
      q1: Math.round(roicValues[q1Index] * 1000) / 1000,
      q2: Math.round(roicValues[q2Index] * 1000) / 1000,
      q3: Math.round(roicValues[q3Index] * 1000) / 1000
    }
  };
}

/**
 * 業界比較データを生成（サンプルデータ）
 */
export function generateIndustryComparison(industryCode: string): IndustryComparison | null {
  const industryData = getIndustryData(industryCode);
  if (!industryData) return null;
  
  // サンプル企業データ生成
  const sampleCompanies: CompanyROICData[] = industryData.representative_companies.map((company) => {
    // 業界特性に基づいてサンプルROIC値を生成
    const baseROIC = generateSampleROIC(industryData.characteristics.typical_roic_range);
    
    return {
      company_code: company.code,
      company_name: company.name,
      industry_code: industryCode,
      roic_value: baseROIC,
      calculation_method: 'detailed',
      fiscal_year: '2024'
    };
  });
  
  // 追加のサンプル企業を生成（業界内の他企業をシミュレート）
  for (let i = 0; i < 12; i++) {
    const baseROIC = generateSampleROIC(industryData.characteristics.typical_roic_range);
    sampleCompanies.push({
      company_code: `${industryCode}${String(i + 100).padStart(3, '0')}`,
      company_name: `${industryData.industry_name}企業${i + 1}`,
      industry_code: industryCode,
      roic_value: baseROIC,
      calculation_method: 'standard',
      fiscal_year: '2024'
    });
  }
  
  const statistics = calculateIndustryStatistics(sampleCompanies);
  
  return {
    industry_code: industryCode,
    industry_name: industryData.industry_name,
    companies: sampleCompanies,
    statistics
  };
}

/**
 * 典型的なROIC範囲からサンプル値を生成
 */
function generateSampleROIC(typicalRange: string): number {
  const [minStr, maxStr] = typicalRange.replace('%', '').split('-');
  const min = parseFloat(minStr) / 100;
  const max = parseFloat(maxStr) / 100;
  
  // 正規分布に近い値を生成
  const random1 = Math.random();
  const random2 = Math.random();
  const normal = Math.sqrt(-2 * Math.log(random1)) * Math.cos(2 * Math.PI * random2);
  
  const mean = (min + max) / 2;
  const stdDev = (max - min) / 6; // 3シグマルール
  
  let value = mean + normal * stdDev;
  
  // 範囲内に制限
  value = Math.max(min * 0.5, Math.min(max * 1.5, value));
  
  return Math.round(value * 10000) / 10000; // 小数点4桁まで
}

/**
 * 業界特性の説明文を取得
 */
export function getIndustryCharacteristics(industryCode: string): string {
  const industryData = getIndustryData(industryCode);
  if (!industryData) return '';
  
  const { characteristics, roic_adjustment } = industryData;
  
  return `
    資本集約度: ${characteristics.capital_intensity}
    R&D集約度: ${characteristics.r_and_d_intensity}
    運転資本回転率: ${characteristics.working_capital_turnover}
    典型的ROIC範囲: ${characteristics.typical_roic_range}
    調整理由: ${roic_adjustment.reason}
  `.trim();
}

/**
 * 四分位ランクの説明を取得
 */
export function getQuartileDescription(quartile: string): string {
  const descriptions = {
    'top': '業界上位25%（優秀）',
    'upper_middle': '業界25-50%（良好）',
    'lower_middle': '業界50-75%（平均的）',
    'bottom': '業界下位25%（改善要）'
  };
  
  return descriptions[quartile as keyof typeof descriptions] || '不明';
}

/**
 * ROIC値の色分け用クラス名を取得
 */
export function getROICColorClass(roic: number, quartile?: string): string {
  if (quartile) {
    switch (quartile) {
      case 'top': return 'text-green-600 font-bold';
      case 'upper_middle': return 'text-blue-600 font-semibold';
      case 'lower_middle': return 'text-yellow-600';
      case 'bottom': return 'text-red-600';
    }
  }
  
  // 絶対値ベースの色分け
  if (roic >= 0.2) return 'text-green-600 font-bold';
  if (roic >= 0.15) return 'text-blue-600 font-semibold';
  if (roic >= 0.1) return 'text-yellow-600';
  if (roic >= 0.05) return 'text-orange-600';
  return 'text-red-600';
}