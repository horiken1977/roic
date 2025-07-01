export default function Home() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          ROIC分析アプリケーション
        </h1>
        <p className="text-gray-600 mb-6">
          日系上場企業のROIC（投下資本利益率）を計算・分析・比較できるツールです。
        </p>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="text-xl font-semibold text-blue-900 mb-2">
              企業検索・分析
            </h2>
            <p className="text-blue-700 text-sm">
              EDINET APIから取得した財務データを基に、企業のROICを自動計算します。
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h2 className="text-xl font-semibold text-green-900 mb-2">
              業界比較
            </h2>
            <p className="text-green-700 text-sm">
              同業界内でのROIC比較とランキング表示が可能です。
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">主な機能</h2>
        <ul className="space-y-2 text-gray-600">
          <li className="flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            ROIC自動計算（4つの計算方式対応）
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            企業検索・フィルタリング機能
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            業界内比較・ランキング表示
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
            トレンドチャート・可視化
          </li>
        </ul>
      </div>
    </div>
  );
}
