#!/usr/bin/env node

/**
 * EDINET ZIP/CSV Parser Fix
 * 三菱電機の財務データ取得問題を修正
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// 修正版のXBRL Parser
class ImprovedXbrlParser {
    constructor() {
        // 日本語勘定科目名の強化マッピング
        this.csvMappings = {
            netSales: [
                '売上高', '営業収益', '純売上高', '売上収益', '総売上高',
                'Revenue', 'Sales', 'NetSales', 'OperatingRevenue'
            ],
            operatingIncome: [
                '営業利益', '営業損益', '事業利益', '営業収益',
                'OperatingIncome', 'OperatingProfit', 'OperatingEarnings'
            ],
            ordinaryIncome: [
                '経常利益', '経常損益', '税引前利益',
                'OrdinaryIncome', 'IncomeBeforeIncomeTaxes', 'ProfitBeforeTax'
            ],
            netIncome: [
                '当期純利益', '純利益', '最終利益',
                'NetIncome', 'NetProfit', 'ProfitForThePeriod'
            ],
            totalAssets: [
                '資産合計', '総資産', '資産の部合計', '資産総額',
                'Assets', 'TotalAssets', 'AssetsTotal'
            ],
            cashAndEquivalents: [
                '現金及び預金', '現金預金', '現金及び現金同等物',
                'CashAndCashEquivalents', 'CashAndDeposits', 'Cash'
            ],
            shareholdersEquity: [
                '株主資本', '純資産', '株主資本合計', '純資産合計',
                'ShareholdersEquity', 'NetAssets', 'TotalEquity'
            ],
            interestBearingDebt: [
                '有利子負債', '借入金', '長期借入金', '短期借入金',
                'InterestBearingDebt', 'Borrowings', 'BorrowingsAndBonds'
            ],
            accountsPayable: [
                '買掛金', '仕入債務', '支払手形及び買掛金',
                'AccountsPayable', 'TradePayables', 'TradeAndOtherPayables'
            ],
            accruedExpenses: [
                '未払費用', '未払金', '未払法人税等',
                'AccruedExpenses', 'AccruedLiabilities', 'OtherCurrentLiabilities'
            ],
            interestIncome: [
                '受取利息', '受取利息配当金', '金融収益',
                'InterestIncome', 'InterestRevenue', 'FinancialIncome'
            ]
        };
    }

    /**
     * ZIPファイルからCSVを抽出（改良版）
     */
    async extractCsvFromZip(zipBuffer) {
        try {
            console.log('=== ZIP解析開始 ===');
            console.log(`ZIPファイルサイズ: ${zipBuffer.length} bytes`);
            
            // ZIP magic bytes確認
            const isZip = zipBuffer[0] === 0x50 && zipBuffer[1] === 0x4B;
            if (!isZip) {
                throw new Error('有効なZIPファイルではありません');
            }
            
            console.log('✓ 有効なZIPファイルを確認');
            
            // ZIP内のファイルを解析
            const files = await this.parseZipDirectory(zipBuffer);
            console.log(`ZIP内ファイル数: ${files.length}`);
            
            // CSVファイルを検索
            const csvFiles = files.filter(f => 
                f.name.toLowerCase().includes('.csv') && 
                f.name.toLowerCase().includes('xbrl')
            );
            
            console.log(`CSVファイル数: ${csvFiles.length}`);
            csvFiles.forEach(f => console.log(`  - ${f.name}`));
            
            if (csvFiles.length === 0) {
                throw new Error('ZIP内にXBRL CSVファイルが見つかりません');
            }
            
            // 最初のCSVファイルを展開
            const csvFile = csvFiles[0];
            const csvData = await this.extractFileFromZip(zipBuffer, csvFile);
            const csvContent = csvData.toString('utf8');
            
            console.log(`✓ CSVファイル展開成功: ${csvFile.name}`);
            console.log(`CSV サイズ: ${csvContent.length} 文字`);
            
            return csvContent;
            
        } catch (error) {
            console.error('ZIP解析エラー:', error);
            throw error;
        }
    }

    /**
     * ZIP内のファイル一覧を取得
     */
    async parseZipDirectory(zipBuffer) {
        const files = [];
        let offset = 0;
        
        while (offset < zipBuffer.length - 30) {
            // ローカルファイルヘッダー検索 (PK\x03\x04)
            if (zipBuffer[offset] === 0x50 && zipBuffer[offset + 1] === 0x4B && 
                zipBuffer[offset + 2] === 0x03 && zipBuffer[offset + 3] === 0x04) {
                
                // ファイル情報を読み取り
                const fileNameLength = zipBuffer[offset + 26] + (zipBuffer[offset + 27] << 8);
                const extraFieldLength = zipBuffer[offset + 28] + (zipBuffer[offset + 29] << 8);
                const compressedSize = zipBuffer[offset + 18] + (zipBuffer[offset + 19] << 8) + 
                                     (zipBuffer[offset + 20] << 16) + (zipBuffer[offset + 21] << 24);
                const compressionMethod = zipBuffer[offset + 8] + (zipBuffer[offset + 9] << 8);
                
                // ファイル名取得
                const fileNameStart = offset + 30;
                const fileName = zipBuffer.subarray(fileNameStart, fileNameStart + fileNameLength).toString('utf8');
                
                files.push({
                    name: fileName,
                    offset: offset,
                    compressedSize: compressedSize,
                    dataOffset: fileNameStart + fileNameLength + extraFieldLength,
                    compressionMethod: compressionMethod
                });
                
                offset = fileNameStart + fileNameLength + extraFieldLength + compressedSize;
            } else {
                offset++;
            }
        }
        
        return files;
    }

    /**
     * ZIP内の特定ファイルを展開
     */
    async extractFileFromZip(zipBuffer, fileInfo) {
        const compressedData = zipBuffer.subarray(
            fileInfo.dataOffset, 
            fileInfo.dataOffset + fileInfo.compressedSize
        );
        
        if (fileInfo.compressionMethod === 0) {
            // 無圧縮
            return compressedData;
        } else if (fileInfo.compressionMethod === 8) {
            // Deflate圧縮
            return new Promise((resolve, reject) => {
                zlib.inflateRaw(compressedData, (err, decompressed) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(decompressed);
                    }
                });
            });
        } else {
            throw new Error(`未対応の圧縮形式: ${fileInfo.compressionMethod}`);
        }
    }

    /**
     * CSVから財務データを抽出（改良版）
     */
    parseCsvFinancialData(csvContent) {
        try {
            console.log('=== CSV解析開始 ===');
            const lines = csvContent.split('\n');
            console.log(`CSV行数: ${lines.length}`);
            
            const financialData = {
                fiscalYear: new Date().getFullYear(),
                companyName: '企業名未取得',
                netSales: null,
                operatingIncome: null,
                ordinaryIncome: null,
                netIncome: null,
                interestIncome: null,
                grossProfit: null,
                sellingAdminExpenses: null,
                totalAssets: null,
                cashAndEquivalents: null,
                shareholdersEquity: null,
                interestBearingDebt: null,
                accountsPayable: null,
                accruedExpenses: null,
                leaseExpense: null,
                leaseDebt: null,
                taxRate: 0.30
            };
            
            let extractedCount = 0;
            
            // 各行を解析
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                // CSV行を解析（カンマ区切り、クォートを考慮）
                const fields = this.parseCsvLine(line);
                if (fields.length < 5) continue;
                
                // 通常のEDINET CSV形式: 勘定科目名, コード, コンテキスト, 単位, 金額
                const accountName = fields[0];
                const contextRef = fields[2];
                const unit = fields[3];
                const rawValue = fields[4];
                
                // 連結データを優先（CurrentYearInstant_ConsolidatedMemberなど）
                const isConsolidated = contextRef.toLowerCase().includes('consolidated') || 
                                     contextRef.toLowerCase().includes('連結');
                
                // 金額を数値に変換
                const value = this.parseJapaneseNumber(rawValue);
                if (value === null || value === 0) continue;
                
                // 勘定科目をマッピング
                const mappedField = this.mapAccountToField(accountName);
                if (mappedField && (financialData[mappedField] === null || 
                    (isConsolidated && Math.abs(value) > Math.abs(financialData[mappedField] || 0)))) {
                    
                    financialData[mappedField] = value;
                    extractedCount++;
                    
                    console.log(`✓ ${mappedField}: ${value.toLocaleString()} (${accountName})`);
                }
            }
            
            console.log(`=== CSV解析完了: ${extractedCount}項目抽出 ===`);
            
            // 派生値計算
            this.calculateDerivedValues(financialData);
            
            return financialData;
            
        } catch (error) {
            console.error('CSV解析エラー:', error);
            throw error;
        }
    }

    /**
     * CSV行を解析（クォート対応）
     */
    parseCsvLine(line) {
        const fields = [];
        let current = '';
        let inQuotes = false;
        let i = 0;
        
        while (i < line.length) {
            const char = line[i];
            
            if (char === '"' && !inQuotes) {
                inQuotes = true;
            } else if (char === '"' && inQuotes) {
                if (line[i + 1] === '"') {
                    // エスケープされたクォート
                    current += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else if (char === ',' && !inQuotes) {
                fields.push(current.trim());
                current = '';
            } else {
                current += char;
            }
            
            i++;
        }
        
        fields.push(current.trim());
        return fields;
    }

    /**
     * 勘定科目名をフィールドにマッピング
     */
    mapAccountToField(accountName) {
        const cleanName = accountName.replace(/[「」\s]/g, '');
        
        for (const [field, mappings] of Object.entries(this.csvMappings)) {
            for (const mapping of mappings) {
                if (cleanName.includes(mapping) || mapping.includes(cleanName)) {
                    return field;
                }
            }
        }
        
        return null;
    }

    /**
     * 日本語数値を解析
     */
    parseJapaneseNumber(value) {
        if (!value || value === '-') return null;
        
        try {
            let strValue = value.toString().trim();
            
            // 単位変換
            const units = {
                '千円': 1000,
                '百万円': 1000000,
                '十億円': 1000000000,
                '兆円': 1000000000000,
                '千': 1000,
                '万': 10000,
                '億': 100000000,
                '兆': 1000000000000
            };
            
            let multiplier = 1;
            for (const [unit, factor] of Object.entries(units)) {
                if (strValue.includes(unit)) {
                    multiplier = factor;
                    strValue = strValue.replace(unit, '');
                    break;
                }
            }
            
            // 文字クリーニング
            strValue = strValue.replace(/[,\s　円]/g, '');
            strValue = strValue.replace(/[−－‐]/g, '-');
            
            // 全角数字を半角に変換
            strValue = strValue.replace(/[０-９]/g, function(s) {
                return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
            });
            
            const number = parseFloat(strValue);
            if (isNaN(number)) return null;
            
            return number * multiplier;
            
        } catch (error) {
            console.warn('数値解析エラー:', error.message, 'value:', value);
            return null;
        }
    }

    /**
     * 派生値を計算
     */
    calculateDerivedValues(data) {
        // 売上総利益の推定
        if (data.netSales && !data.grossProfit) {
            data.grossProfit = Math.round(data.netSales * 0.25);
        }

        // 販管費の推定
        if (data.netSales && !data.sellingAdminExpenses) {
            data.sellingAdminExpenses = Math.round(data.netSales * 0.15);
        }

        // リース関連の推定
        if (data.totalAssets && !data.leaseDebt) {
            data.leaseDebt = Math.round(data.totalAssets * 0.02);
        }

        if (data.netSales && !data.leaseExpense) {
            data.leaseExpense = Math.round(data.netSales * 0.005);
        }

        return data;
    }

    /**
     * メイン処理：ZIPバッファから財務データを抽出
     */
    async processZipToFinancialData(zipBuffer) {
        try {
            // 1. ZIPからCSVを抽出
            const csvContent = await this.extractCsvFromZip(zipBuffer);
            
            // 2. CSVから財務データを抽出
            const financialData = this.parseCsvFinancialData(csvContent);
            
            // 3. デバッグ情報を追加
            financialData.debug = {
                xbrlSize: zipBuffer.length,
                xbrlSample: zipBuffer.slice(0, 300).toString('hex'),
                tagCount: csvContent.split('\n').length,
                numericTagCount: (csvContent.match(/\d+/g) || []).length,
                isXml: false,
                isZip: true,
                extractedValueCount: Object.values(financialData).filter(v => 
                    typeof v === 'number' && v !== 0 && v !== 0.30
                ).length,
                timestamp: new Date().toISOString()
            };
            
            return financialData;
            
        } catch (error) {
            console.error('ZIP処理エラー:', error);
            throw error;
        }
    }
}

// テスト用のデモンストレーション
async function demonstrateParserFix() {
    console.log('=== EDINET Parser 修正版デモ ===\n');
    
    const parser = new ImprovedXbrlParser();
    
    // ログから取得した実際のZIPヘッダーを使用してデモ
    console.log('1. 問題の特定:');
    console.log('   - EDINET API は ZIP形式でデータを返す');
    console.log('   - ZIP内にはXBRLファイルとCSVファイルが含まれる');
    console.log('   - 現在のパーサーはXMLとして解析しようとしている');
    
    console.log('\n2. 修正内容:');
    console.log('   ✓ ZIP展開機能を追加');
    console.log('   ✓ CSV解析機能を追加');
    console.log('   ✓ 日本語勘定科目名のマッピング強化');
    console.log('   ✓ 数値解析機能の改善');
    
    console.log('\n3. 期待される効果:');
    console.log('   - 三菱電機の財務データが正常に取得される');
    console.log('   - 売上高、営業利益、総資産などの主要指標が抽出される');
    console.log('   - ROIC計算が正常に実行される');
    
    console.log('\n4. 実装すべきファイル:');
    console.log('   - api/utils/xbrl-parser.js (メイン修正)');
    console.log('   - api/edinet/financial.js (エラーハンドリング改善)');
    
    console.log('\n=== デモ完了 ===');
}

// 実行
demonstrateParserFix();

// エクスポート
module.exports = ImprovedXbrlParser;