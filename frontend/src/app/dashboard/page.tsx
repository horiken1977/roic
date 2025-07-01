export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">ROICダッシュボード</h1>
        
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900">総企業数</h3>
            <p className="text-2xl font-bold text-blue-700">3,847</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900">平均ROIC</h3>
            <p className="text-2xl font-bold text-green-700">8.5%</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-900">更新日</h3>
            <p className="text-2xl font-bold text-purple-700">2025/07/01</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">ROIC上位企業</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">順位</th>
                <th className="text-left py-2">企業名</th>
                <th className="text-left py-2">業界</th>
                <th className="text-left py-2">ROIC</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">1</td>
                <td className="py-2">サンプル企業A</td>
                <td className="py-2">テクノロジー</td>
                <td className="py-2 text-green-600 font-semibold">25.3%</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">2</td>
                <td className="py-2">サンプル企業B</td>
                <td className="py-2">ヘルスケア</td>
                <td className="py-2 text-green-600 font-semibold">22.1%</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">3</td>
                <td className="py-2">サンプル企業C</td>
                <td className="py-2">消費財</td>
                <td className="py-2 text-green-600 font-semibold">19.8%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">業界別ROIC平均</h2>
        <div className="text-gray-500 text-center py-8">
          チャートを表示予定（Recharts実装後）
        </div>
      </div>
    </div>
  );
}