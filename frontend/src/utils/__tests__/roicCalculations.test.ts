/**
 * ROIC計算ロジック ユニットテスト
 * 4つの計算方式の正確性と信頼性を検証
 */

import {
  FinancialData,
  ROICResult,
  calculateBasicROIC,
  calculateDetailedROIC,
  calculateAssetROIC,
  calculateModifiedROIC,
  calculateAllROIC,
  formatROIC,
  formatCurrency,
  getROICEvaluationLevel,
  sampleCompanyData
} from '../roicCalculations'

describe('ROIC計算ロジック ユニットテスト', () => {
  // テスト用の標準的な財務データ
  const standardFinancialData: FinancialData = {
    operatingIncome: 100000000, // 1,000億円
    interestIncome: 5000000,    // 50億円
    taxRate: 0.30,              // 30%
    totalAssets: 1000000000,    // 1兆円
    cashAndEquivalents: 100000000, // 1,000億円
    shareholdersEquity: 400000000,  // 4,000億円
    interestBearingDebt: 300000000, // 3,000億円
    accountsPayable: 50000000,      // 500億円
    accruedExpenses: 30000000,      // 300億円
    leaseExpense: 10000000,         // 100億円
    leaseDebt: 80000000             // 800億円
  }

  // エッジケース用のデータ
  const zeroValueData: FinancialData = {
    operatingIncome: 0,
    interestIncome: 0,
    taxRate: 0,
    totalAssets: 0,
    cashAndEquivalents: 0,
    shareholdersEquity: 0,
    interestBearingDebt: 0,
    accountsPayable: 0,
    accruedExpenses: 0,
    leaseExpense: 0,
    leaseDebt: 0
  }

  const negativeOperatingIncomeData: FinancialData = {
    ...standardFinancialData,
    operatingIncome: -50000000 // マイナス500億円
  }

  describe('基本方式計算テスト', () => {
    test('標準的な財務データで正確に計算される', () => {
      const result = calculateBasicROIC(standardFinancialData)
      
      // 期待値計算: NOPAT = 100,000 × (1 - 0.30) = 70,000
      // 投下資本 = 1,000,000 - 100,000 = 900,000
      // ROIC = 70,000 / 900,000 = 0.0778 (7.78%)
      expect(result.roic).toBeCloseTo(0.0778, 4)
      expect(result.nopat).toBe(70000000)
      expect(result.investedCapital).toBe(900000000)
      expect(result.calculationMethod).toBe('basic')
    })

    test('投下資本が0の場合、ROICは0になる', () => {
      const data: FinancialData = {
        ...standardFinancialData,
        totalAssets: 100000000, // 総資産 = 現金と同額
        cashAndEquivalents: 100000000
      }
      
      const result = calculateBasicROIC(data)
      expect(result.roic).toBe(0)
      expect(result.investedCapital).toBe(0)
    })

    test('営業利益がマイナスの場合も正しく計算される', () => {
      const result = calculateBasicROIC(negativeOperatingIncomeData)
      
      // 期待値: NOPAT = -50,000 × (1 - 0.30) = -35,000
      expect(result.nopat).toBe(-35000000)
      expect(result.roic).toBeCloseTo(-0.0389, 4) // 約-3.89%
    })

    test('計算内訳が正しく格納される', () => {
      const result = calculateBasicROIC(standardFinancialData)
      
      expect(result.breakdown).toEqual({
        '営業利益': 100000000,
        '税率': 0.30,
        'NOPAT': 70000000,
        '総資産': 1000000000,
        '現金等': 100000000,
        '投下資本': 900000000
      })
    })
  })

  describe('詳細方式計算テスト', () => {
    test('標準的な財務データで正確に計算される', () => {
      const result = calculateDetailedROIC(standardFinancialData)
      
      // 期待値計算: 
      // 調整営業利益 = 100,000 + 5,000 = 105,000
      // NOPAT = 105,000 × (1 - 0.30) = 73,500
      // 投下資本 = 400,000 + 300,000 = 700,000
      // ROIC = 73,500 / 700,000 = 0.105 (10.5%)
      expect(result.roic).toBeCloseTo(0.105, 4)
      expect(result.nopat).toBe(73500000)
      expect(result.investedCapital).toBe(700000000)
      expect(result.calculationMethod).toBe('detailed')
    })

    test('受取利息が含まれて計算される', () => {
      const result = calculateDetailedROIC(standardFinancialData)
      
      expect(result.breakdown['受取利息']).toBe(5000000)
      expect(result.breakdown['調整営業利益']).toBe(105000000)
    })

    test('投下資本が株主資本+有利子負債で計算される', () => {
      const result = calculateDetailedROIC(standardFinancialData)
      
      expect(result.breakdown['株主資本']).toBe(400000000)
      expect(result.breakdown['有利子負債']).toBe(300000000)
      expect(result.investedCapital).toBe(700000000)
    })
  })

  describe('アセット方式計算テスト', () => {
    test('標準的な財務データで正確に計算される', () => {
      const result = calculateAssetROIC(standardFinancialData)
      
      // 期待値計算:
      // NOPAT = 105,000 × (1 - 0.30) = 73,500 (詳細方式と同じ)
      // 無利子負債 = 50,000 + 30,000 = 80,000
      // 投下資本 = 1,000,000 - 80,000 = 920,000
      // ROIC = 73,500 / 920,000 = 0.0799 (7.99%)
      expect(result.roic).toBeCloseTo(0.0799, 4)
      expect(result.nopat).toBe(73500000)
      expect(result.investedCapital).toBe(920000000)
      expect(result.calculationMethod).toBe('asset')
    })

    test('無利子負債が正しく計算される', () => {
      const result = calculateAssetROIC(standardFinancialData)
      
      expect(result.breakdown['買掛金']).toBe(50000000)
      expect(result.breakdown['未払金']).toBe(30000000)
      expect(result.breakdown['無利子負債']).toBe(80000000)
    })

    test('総資産ベースの投下資本計算が正しい', () => {
      const result = calculateAssetROIC(standardFinancialData)
      
      expect(result.breakdown['総資産']).toBe(1000000000)
      expect(result.investedCapital).toBe(920000000) // 総資産 - 無利子負債
    })
  })

  describe('修正方式（リース調整）計算テスト', () => {
    test('標準的な財務データで正確に計算される', () => {
      const result = calculateModifiedROIC(standardFinancialData)
      
      // 期待値計算:
      // ベースNOPAT = 73,500 (詳細方式)
      // リース調整 = 10,000 × (1 - 0.30) = 7,000
      // 修正NOPAT = 73,500 + 7,000 = 80,500
      // 修正投下資本 = 700,000 + 80,000 = 780,000
      // ROIC = 80,500 / 780,000 = 0.1032 (10.32%)
      expect(result.roic).toBeCloseTo(0.1032, 4)
      expect(result.nopat).toBe(80500000)
      expect(result.investedCapital).toBe(780000000)
      expect(result.calculationMethod).toBe('modified')
    })

    test('リース項目が正しく調整される', () => {
      const result = calculateModifiedROIC(standardFinancialData)
      
      expect(result.breakdown['リース費用']).toBe(10000000)
      expect(result.breakdown['リース債務']).toBe(80000000)
      expect(result.breakdown['修正NOPAT']).toBe(80500000)
      expect(result.breakdown['修正投下資本']).toBe(780000000)
    })

    test('リース項目が未定義の場合は0として扱われる', () => {
      const dataWithoutLease: FinancialData = {
        ...standardFinancialData,
        leaseExpense: undefined,
        leaseDebt: undefined
      }
      
      const result = calculateModifiedROIC(dataWithoutLease)
      
      // ベースの詳細方式と同じ結果になるはず
      const baseResult = calculateDetailedROIC(dataWithoutLease)
      expect(result.roic).toBeCloseTo(baseResult.roic, 4)
      expect(result.breakdown['リース費用']).toBe(0)
      expect(result.breakdown['リース債務']).toBe(0)
    })
  })

  describe('全計算方式統合テスト', () => {
    test('calculateAllROIC が4つの方式すべてを返す', () => {
      const results = calculateAllROIC(standardFinancialData)
      
      expect(results).toHaveProperty('basic')
      expect(results).toHaveProperty('detailed')
      expect(results).toHaveProperty('asset')
      expect(results).toHaveProperty('modified')
      
      expect(results.basic.calculationMethod).toBe('basic')
      expect(results.detailed.calculationMethod).toBe('detailed')
      expect(results.asset.calculationMethod).toBe('asset')
      expect(results.modified.calculationMethod).toBe('modified')
    })

    test('各方式で異なるROIC値が計算される', () => {
      const results = calculateAllROIC(standardFinancialData)
      
      // 各方式で異なる値になることを確認
      expect(results.basic.roic).not.toBe(results.detailed.roic)
      expect(results.detailed.roic).not.toBe(results.asset.roic)
      expect(results.asset.roic).not.toBe(results.modified.roic)
    })

    test('修正方式でリース調整効果が反映される', () => {
      const results = calculateAllROIC(standardFinancialData)
      
      // 修正方式のNOPATが詳細方式より大きくなることを確認（リース調整効果）
      expect(results.modified.nopat).toBeGreaterThan(results.detailed.nopat)
      
      // 修正方式の投下資本も詳細方式より大きくなることを確認（リース債務追加）
      expect(results.modified.investedCapital).toBeGreaterThan(results.detailed.investedCapital)
      
      // リース調整によりROICが変化することを確認（必ずしも高くなるとは限らない）
      expect(results.modified.roic).not.toBe(results.detailed.roic)
    })
  })

  describe('エッジケース処理テスト', () => {
    test('すべての値が0の場合', () => {
      const results = calculateAllROIC(zeroValueData)
      
      Object.values(results).forEach(result => {
        expect(result.roic).toBe(0)
        expect(result.nopat).toBe(0)
        expect(result.investedCapital).toBe(0)
      })
    })

    test('極端に小さい値での計算精度', () => {
      const smallValueData: FinancialData = {
        ...standardFinancialData,
        operatingIncome: 1,      // 1円
        totalAssets: 1000000,    // 100万円
        cashAndEquivalents: 0
      }
      
      const result = calculateBasicROIC(smallValueData)
      expect(result.roic).toBeCloseTo(0.0000007, 7) // 非常に小さいが0ではない
    })

    test('極端に大きい値での計算', () => {
      const largeValueData: FinancialData = {
        ...standardFinancialData,
        operatingIncome: 1e15,    // 1000兆円
        totalAssets: 1e16,        // 1京円
        cashAndEquivalents: 1e15  // 1000兆円
      }
      
      const result = calculateBasicROIC(largeValueData)
      expect(result.roic).toBeCloseTo(0.0778, 4) // 同じ比率なので結果は変わらない
    })
  })

  describe('フォーマット関数テスト', () => {
    test('formatROIC が正しく百分率表示する', () => {
      expect(formatROIC(0.1234)).toBe('12.34%')
      expect(formatROIC(0.0567)).toBe('5.67%')
      expect(formatROIC(-0.0234)).toBe('-2.34%')
      expect(formatROIC(0)).toBe('0.00%')
    })

    test('formatCurrency が適切な単位で表示する', () => {
      expect(formatCurrency(1500000000000)).toBe('1.5兆円')    // 兆円
      expect(formatCurrency(150000000000)).toBe('1,500億円')   // 億円
      expect(formatCurrency(15000000)).toBe('1,500万円')       // 万円
      expect(formatCurrency(1500)).toBe('1,500円')            // 円
      expect(formatCurrency(0)).toBe('-')                     // ゼロ
      expect(formatCurrency(-1500000000)).toBe('-15億円')     // マイナス
    })

    test('formatCurrency 特殊値の処理', () => {
      expect(formatCurrency(null as any)).toBe('-')
      expect(formatCurrency(undefined as any)).toBe('-')
      expect(formatCurrency(NaN)).toBe('-')
    })

    test('formatCurrency 小数点以下の処理', () => {
      expect(formatCurrency(0.5)).toBe('0.50円')
      expect(formatCurrency(0.123)).toBe('0.12円')
      expect(formatCurrency(0.999)).toBe('1.00円')
    })
  })

  describe('ROIC評価レベルテスト', () => {
    test('優秀レベル（15%以上）', () => {
      const evaluation = getROICEvaluationLevel(0.18)
      expect(evaluation.level).toBe('excellent')
      expect(evaluation.description).toBe('優秀（15%以上）')
      expect(evaluation.color).toBe('text-green-600')
    })

    test('良好レベル（10-15%）', () => {
      const evaluation = getROICEvaluationLevel(0.12)
      expect(evaluation.level).toBe('good')
      expect(evaluation.description).toBe('良好（10-15%）')
      expect(evaluation.color).toBe('text-blue-600')
    })

    test('平均的レベル（5-10%）', () => {
      const evaluation = getROICEvaluationLevel(0.07)
      expect(evaluation.level).toBe('average')
      expect(evaluation.description).toBe('平均的（5-10%）')
      expect(evaluation.color).toBe('text-yellow-600')
    })

    test('要改善レベル（5%未満）', () => {
      const evaluation = getROICEvaluationLevel(0.03)
      expect(evaluation.level).toBe('poor')
      expect(evaluation.description).toBe('要改善（5%未満）')
      expect(evaluation.color).toBe('text-red-600')
    })

    test('境界値テスト', () => {
      expect(getROICEvaluationLevel(0.15).level).toBe('excellent')
      expect(getROICEvaluationLevel(0.1499).level).toBe('good')
      expect(getROICEvaluationLevel(0.10).level).toBe('good')
      expect(getROICEvaluationLevel(0.0999).level).toBe('average')
      expect(getROICEvaluationLevel(0.05).level).toBe('average')
      expect(getROICEvaluationLevel(0.0499).level).toBe('poor')
    })

    test('マイナス値の評価', () => {
      const evaluation = getROICEvaluationLevel(-0.05)
      expect(evaluation.level).toBe('poor')
    })
  })

  describe('サンプルデータテスト', () => {
    test('サンプル企業データが正常に計算される', () => {
      const results = calculateAllROIC(sampleCompanyData)
      
      // サンプルデータで計算エラーが発生しないことを確認
      Object.values(results).forEach(result => {
        expect(result.roic).toBeDefined()
        expect(typeof result.roic).toBe('number')
        expect(result.nopat).toBeDefined()
        expect(result.investedCapital).toBeDefined()
        expect(result.breakdown).toBeDefined()
      })
    })

    test('サンプルデータが現実的な値を持つ', () => {
      expect(sampleCompanyData.operatingIncome).toBeGreaterThan(0)
      expect(sampleCompanyData.totalAssets).toBeGreaterThan(0)
      expect(sampleCompanyData.taxRate).toBeGreaterThan(0)
      expect(sampleCompanyData.taxRate).toBeLessThan(1)
    })
  })

  describe('計算精度テスト', () => {
    test('小数点以下の精度が保たれる', () => {
      const precisionData: FinancialData = {
        ...standardFinancialData,
        operatingIncome: 100000001, // 微小な差
        taxRate: 0.3001             // 微小な差
      }
      
      const result1 = calculateBasicROIC(standardFinancialData)
      const result2 = calculateBasicROIC(precisionData)
      
      // 微小な入力の差が出力に反映されることを確認
      expect(result1.roic).not.toBe(result2.roic)
      expect(Math.abs(result1.roic - result2.roic)).toBeGreaterThan(0)
    })

    test('税率100%での計算', () => {
      const data: FinancialData = {
        ...standardFinancialData,
        taxRate: 1.0 // 税率100%
      }
      
      const result = calculateBasicROIC(data)
      expect(result.nopat).toBe(0) // 税引後利益は0になる
      expect(result.roic).toBe(0)
    })
  })

  describe('実データシナリオテスト', () => {
    test('トヨタ自動車類似のデータ', () => {
      const toyotaLikeData: FinancialData = {
        operatingIncome: 2900000000000,    // 2.9兆円
        interestIncome: 150000000000,      // 1,500億円
        taxRate: 0.30,
        totalAssets: 47000000000000,       // 47兆円
        cashAndEquivalents: 4500000000000, // 4.5兆円
        shareholdersEquity: 22000000000000, // 22兆円
        interestBearingDebt: 15000000000000, // 15兆円
        accountsPayable: 3000000000000,     // 3兆円
        accruedExpenses: 2000000000000,     // 2兆円
        leaseExpense: 300000000000,         // 3,000億円
        leaseDebt: 2700000000000            // 2.7兆円
      }
      
      const results = calculateAllROIC(toyotaLikeData)
      
      // 自動車業界の一般的なROIC範囲（5-15%）内にあることを確認
      Object.values(results).forEach(result => {
        expect(result.roic).toBeGreaterThan(0.02) // 2%以上
        expect(result.roic).toBeLessThan(0.20)    // 20%未満
      })
    })

    test('IT企業類似のデータ（高ROIC）', () => {
      const itCompanyData: FinancialData = {
        operatingIncome: 800000000000,     // 8,000億円
        interestIncome: 50000000000,       // 500億円
        taxRate: 0.25,
        totalAssets: 3000000000000,        // 3兆円
        cashAndEquivalents: 1000000000000, // 1兆円
        shareholdersEquity: 2000000000000, // 2兆円
        interestBearingDebt: 500000000000, // 5,000億円
        accountsPayable: 200000000000,     // 2,000億円
        accruedExpenses: 100000000000,     // 1,000億円
        leaseExpense: 100000000000,        // 1,000億円
        leaseDebt: 900000000000            // 9,000億円
      }
      
      const results = calculateAllROIC(itCompanyData)
      
      // IT企業の高いROICを確認
      Object.values(results).forEach(result => {
        expect(result.roic).toBeGreaterThan(0.15) // 15%以上
      })
    })
  })
})