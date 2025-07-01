export default function CompaniesPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">企業検索</h1>
        
        <div className="mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="企業名で検索..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              検索
            </button>
          </div>
        </div>
        
        <div className="flex gap-4 mb-6">
          <select className="px-3 py-2 border border-gray-300 rounded-lg">
            <option value="">業界を選択</option>
            <option value="manufacturing">製造業</option>
            <option value="finance">金融業</option>
            <option value="retail">小売業</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg">
            <option value="">市場を選択</option>
            <option value="prime">プライム市場</option>
            <option value="standard">スタンダード市場</option>
            <option value="growth">グロース市場</option>
          </select>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">検索結果</h2>
        <div className="text-gray-500 text-center py-8">
          企業を検索してください
        </div>
      </div>
    </div>
  );
}