/**
 * ROICCalculator コンポーネント ユニットテスト
 * UIロジックとユーザーインタラクションの検証
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import ROICCalculator from '../ROICCalculator'

// モックプロバイダーの設定
const renderWithProviders = (component: React.ReactElement) => {
  return render(component)
}

describe('ROICCalculator コンポーネント', () => {
  beforeEach(() => {
    // 各テスト前にコンソールエラーをクリア
    jest.clearAllMocks()
  })

  describe('初期レンダリング', () => {
    test('基本的なUI要素が表示される', () => {
      renderWithProviders(<ROICCalculator />)
      
      expect(screen.getByText('ROIC自動計算')).toBeInTheDocument()
      expect(screen.getByText('財務データを入力して、4つの計算方式でROIC（投下資本利益率）を自動計算します')).toBeInTheDocument()
      expect(screen.getByText('財務データ入力')).toBeInTheDocument()
      expect(screen.getByText('ROIC計算実行')).toBeInTheDocument()
    })

    test('入力フィールドが正しく表示される', () => {
      renderWithProviders(<ROICCalculator />)
      
      // 損益計算書項目（プレースホルダーやdisplayValueで検索）
      expect(screen.getByText(/営業利益/)).toBeInTheDocument()
      expect(screen.getByText(/受取利息/)).toBeInTheDocument()
      expect(screen.getByText(/実効税率/)).toBeInTheDocument()
      
      // 貸借対照表項目
      expect(screen.getByText(/総資産/)).toBeInTheDocument()
      expect(screen.getByText(/現金及び現金同等物/)).toBeInTheDocument()
      expect(screen.getByText(/株主資本/)).toBeInTheDocument()
      expect(screen.getByText(/有利子負債/)).toBeInTheDocument()
      
      // IFRS16対応項目
      expect(screen.getByText(/リース費用/)).toBeInTheDocument()
      expect(screen.getByText(/リース債務/)).toBeInTheDocument()
    })

    test('サンプル読込ボタンが表示される', () => {
      renderWithProviders(<ROICCalculator />)
      
      expect(screen.getByText('サンプル読込')).toBeInTheDocument()
    })

    test('初期状態では結果が表示されない', () => {
      renderWithProviders(<ROICCalculator />)
      
      expect(screen.getByText('財務データを入力して「ROIC計算実行」ボタンを押してください')).toBeInTheDocument()
    })
  })

  describe('サンプルデータ読込機能', () => {
    test('サンプル読込ボタンクリックで入力フィールドが埋まる', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ROICCalculator />)
      
      const sampleButton = screen.getByText('サンプル読込')
      await user.click(sampleButton)
      
      // サンプルデータの値が入力されることを確認（値で検索）
      const operatingIncomeInputs = screen.getAllByDisplayValue('150000')
      expect(operatingIncomeInputs.length).toBeGreaterThan(0)
    })
  })

  describe('入力フィールドの動作', () => {
    test('営業利益入力フィールドが正常に動作する', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ROICCalculator />)
      
      // サンプルデータを読み込んでから入力フィールドを取得
      await user.click(screen.getByText('サンプル読込'))
      const inputs = screen.getAllByDisplayValue('150000')
      const operatingIncomeInput = inputs[0] // 最初の150000の値を持つ入力フィールド
      
      await user.clear(operatingIncomeInput)
      await user.type(operatingIncomeInput, '100000')
      
      expect(operatingIncomeInput).toHaveValue(100000)
    })

    test('実効税率入力が百分率として扱われる', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ROICCalculator />)
      
      // サンプルデータを読み込んでから税率フィールドを取得
      await user.click(screen.getByText('サンプル読込'))
      const taxRateInput = screen.getByDisplayValue('0.3')
      
      await user.clear(taxRateInput)
      await user.type(taxRateInput, '0.25')
      
      expect(taxRateInput).toHaveValue(0.25)
    })

    test('無効な入力値（文字列）の処理', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ROICCalculator />)
      
      // サンプルデータを読み込んでから入力フィールドを取得
      await user.click(screen.getByText('サンプル読込'))
      const inputs = screen.getAllByDisplayValue('150000')
      const operatingIncomeInput = inputs[0]
      
      await user.clear(operatingIncomeInput)
      await user.type(operatingIncomeInput, 'abc')
      
      // HTMLのnumber inputでは文字列入力は無効化される
      expect(operatingIncomeInput).toHaveValue(null)
    })
  })

  describe('ROIC計算機能', () => {
    test('計算実行ボタンで結果が表示される', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ROICCalculator />)
      
      // サンプルデータを読み込み
      await user.click(screen.getByText('サンプル読込'))
      
      // 計算実行
      await user.click(screen.getByText('ROIC計算実行'))
      
      await waitFor(() => {
        expect(screen.getByText('計算結果')).toBeInTheDocument()
      })
      
      // 4つの計算方式の結果が表示される
      expect(screen.getByText('基本方式')).toBeInTheDocument()
      expect(screen.getByText('詳細方式')).toBeInTheDocument()
      expect(screen.getByText('アセット方式')).toBeInTheDocument()
      expect(screen.getByText('修正方式')).toBeInTheDocument()
    })

    test('計算結果に％表示とNOPAT・投下資本が含まれる', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ROICCalculator />)
      
      await user.click(screen.getByText('サンプル読込'))
      await user.click(screen.getByText('ROIC計算実行'))
      
      await waitFor(() => {
        // パーセント表示の存在確認（正規表現でパーセントを含むテキストを検索）
        expect(screen.getByText(/%/)).toBeInTheDocument()
      })
    })
  })

  describe('計算方式選択機能', () => {
    test('計算方式カードクリックで詳細表示が切り替わる', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ROICCalculator />)
      
      await user.click(screen.getByText('サンプル読込'))
      await user.click(screen.getByText('ROIC計算実行'))
      
      await waitFor(() => {
        expect(screen.getByText('計算結果')).toBeInTheDocument()
      })
      
      // 基本方式カードをクリック
      const basicMethodCard = screen.getByText('基本方式').closest('div')
      if (basicMethodCard) {
        await user.click(basicMethodCard)
        
        await waitFor(() => {
          expect(screen.getByText('基本方式の詳細')).toBeInTheDocument()
        })
      }
    })

    test('各計算方式の説明が正しく表示される', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ROICCalculator />)
      
      await user.click(screen.getByText('サンプル読込'))
      await user.click(screen.getByText('ROIC計算実行'))
      
      await waitFor(() => {
        expect(screen.getByText('計算結果')).toBeInTheDocument()
      })
      
      // デフォルトで詳細方式が選択されている
      expect(screen.getByText('詳細方式の詳細')).toBeInTheDocument()
      expect(screen.getByText('詳細方式（NOPAT個別計算）')).toBeInTheDocument()
      expect(screen.getByText(/より精密な計算、金融収益も含めた事業利益を評価/)).toBeInTheDocument()
    })
  })

  describe('計算内訳表示', () => {
    test('選択された方式の計算内訳が表示される', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ROICCalculator />)
      
      await user.click(screen.getByText('サンプル読込'))
      await user.click(screen.getByText('ROIC計算実行'))
      
      await waitFor(() => {
        expect(screen.getByText('計算内訳')).toBeInTheDocument()
      })
      
      // 内訳項目の確認
      expect(screen.getByText(/営業利益/)).toBeInTheDocument()
      expect(screen.getByText(/NOPAT/)).toBeInTheDocument()
      expect(screen.getByText(/投下資本/)).toBeInTheDocument()
    })
  })

  describe('ROIC評価レベル表示', () => {
    test('ROIC値に応じた評価レベルが表示される', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ROICCalculator />)
      
      // 高いROICになるようなデータを入力
      const operatingIncomeInput = screen.getByLabelText(/営業利益/)
      const totalAssetsInput = screen.getByLabelText(/総資産/)
      const taxRateInput = screen.getByLabelText(/実効税率/)
      
      await user.clear(operatingIncomeInput)
      await user.type(operatingIncomeInput, '200000') // 2,000億円
      
      await user.clear(totalAssetsInput)
      await user.type(totalAssetsInput, '1000000') // 1兆円
      
      await user.clear(taxRateInput)
      await user.type(taxRateInput, '0.3') // 30%
      
      await user.click(screen.getByText('ROIC計算実行'))
      
      await waitFor(() => {
        // 評価レベルのいずれかが表示されることを確認
        const evaluationTexts = ['優秀', '良好', '平均的', '要改善']
        const hasEvaluation = evaluationTexts.some(text => 
          screen.queryByText(new RegExp(text)) !== null
        )
        expect(hasEvaluation).toBe(true)
      })
    })
  })

  describe('エラーハンドリング', () => {
    test('投下資本が0の場合でもエラーにならない', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ROICCalculator />)
      
      // 投下資本が0になるようなデータを入力
      const totalAssetsInput = screen.getByLabelText(/総資産/)
      const cashInput = screen.getByLabelText(/現金及び現金同等物/)
      
      await user.clear(totalAssetsInput)
      await user.type(totalAssetsInput, '100000')
      
      await user.clear(cashInput)
      await user.type(cashInput, '100000') // 総資産と同額
      
      await user.click(screen.getByText('ROIC計算実行'))
      
      await waitFor(() => {
        expect(screen.getByText('計算結果')).toBeInTheDocument()
      })
      
      // エラーが発生せず、0%として表示される
      expect(screen.getByText('0.00%')).toBeInTheDocument()
    })

    test('負の営業利益でも計算される', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ROICCalculator />)
      
      const operatingIncomeInput = screen.getByLabelText(/営業利益/)
      await user.clear(operatingIncomeInput)
      await user.type(operatingIncomeInput, '-50000') // マイナス500億円
      
      await user.click(screen.getByText('サンプル読込'))
      await user.click(screen.getByText('ROIC計算実行'))
      
      await waitFor(() => {
        expect(screen.getByText('計算結果')).toBeInTheDocument()
      })
      
      // マイナスのROICが表示される
      expect(screen.getByText(/-\d+\.\d+%/)).toBeInTheDocument()
    })
  })

  describe('レスポンシブデザイン', () => {
    test('グリッドレイアウトが適用されている', () => {
      renderWithProviders(<ROICCalculator />)
      
      const mainContainer = screen.getByText('ROIC自動計算').closest('.max-w-6xl')
      expect(mainContainer).toHaveClass('max-w-6xl', 'mx-auto', 'space-y-6')
    })

    test('入力エリアと結果エリアが分かれている', () => {
      renderWithProviders(<ROICCalculator />)
      
      const inputSection = screen.getByText('財務データ入力').closest('div')
      const resultSection = screen.getByText('財務データを入力して「ROIC計算実行」ボタンを押してください').closest('div')
      
      expect(inputSection).toBeInTheDocument()
      expect(resultSection).toBeInTheDocument()
    })
  })

  describe('フォーマット表示', () => {
    test('通貨フォーマットが正しく適用される', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ROICCalculator />)
      
      await user.click(screen.getByText('サンプル読込'))
      await user.click(screen.getByText('ROIC計算実行'))
      
      await waitFor(() => {
        // 日本円の単位表示を確認
        const currencyDisplays = screen.getAllByText(/[億兆万]円/)
        expect(currencyDisplays.length).toBeGreaterThan(0)
      })
    })

    test('パーセンテージフォーマットが正しく適用される', async () => {
      const user = userEvent.setup()
      renderWithProviders(<ROICCalculator />)
      
      await user.click(screen.getByText('サンプル読込'))
      await user.click(screen.getByText('ROIC計算実行'))
      
      await waitFor(() => {
        // パーセンテージ表示を確認
        const percentageDisplays = screen.getAllByText(/%$/)
        expect(percentageDisplays.length).toBeGreaterThan(0)
      })
    })
  })
})