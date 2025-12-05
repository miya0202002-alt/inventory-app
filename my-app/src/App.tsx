import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, Plus, Package, Archive } from 'lucide-react';

// ▼▼▼ ここにGASのウェブアプリURLを貼り付けてください ▼▼▼
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxMvTFQ_XiZq9DflJ5TkogOuMa6wbyjNrNMb1ACSWGK77hGshkmu5fr51C91AVlQPhhTA/exec";
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// データ型定義
interface Item {
  商品ID: number;
  教科書名: string;
  ISBNコード: string;
  出版社: string;
  現在在庫数: number;
  発注点: number;
  保管場所: string;
}

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [view, setView] = useState<'list' | 'add'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [sortMode, setSortMode] = useState<'id' | 'stock' | 'name'>('id');
  
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [qty, setQty] = useState(1);

  const [newItem, setNewItem] = useState({
    name: '', publisher: '', isbn: '', location: '', stock: 1, alert: 5
  });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${GAS_API_URL}?action=get`);
      const data = await response.json();
      
      const formattedData = data.map((item: any) => ({
        ...item,
        商品ID: Number(item.商品ID),
        現在在庫数: Number(item.現在在庫数),
        発注点: Number(item.発注点)
      }));
      
      setItems(formattedData);
    } catch (error) {
      console.error(error);
      alert("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleStockUpdate = async (type: '入庫' | '出庫') => {
    if (!selectedItem) return;
    if (!window.confirm(`${selectedItem.教科書名} を ${qty}冊 ${type}しますか？`)) return;

    setLoading(true);
    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'update',
          id: selectedItem.商品ID,
          type: type,
          qty: qty
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        alert(`${type}完了！`);
        setQty(1);
        setSelectedItem(null);
        fetchItems();
      } else {
        alert(`エラー: ${result.message}`);
      }
    } catch (error) {
      alert("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm(`「${newItem.name}」を登録しますか？`)) return;

    setLoading(true);
    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'add', ...newItem })
      });

      const result = await response.json();

      if (result.status === 'success') {
        alert("登録しました！");
        setNewItem({ name: '', publisher: '', isbn: '', location: '', stock: 1, alert: 5 });
        setView('list');
        fetchItems();
      } else {
        alert(`エラー: ${result.message}`);
      }
    } catch (error) {
      alert("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items
    .filter(item => 
      searchQuery === '' || 
      String(item.教科書名).toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(item.出版社).toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortMode === 'stock') return a.現在在庫数 - b.現在在庫数;
      if (sortMode === 'name') return a.教科書名.localeCompare(b.教科書名);
      return b.商品ID - a.商品ID;
    });

  return (
    <div className="min-h-screen pb-32">
      <div className="max-w-[600px] mx-auto bg-white min-h-screen shadow-xl relative">
        
        {/* ヘッダーエリア */}
        <div className="sticky top-0 bg-white z-10 border-b border-gray-200 px-4 pt-4 pb-2">
          <h1 className="text-xl font-black text-gray-900 mb-3">教科書在庫管理</h1>
          <div className="flex bg-gray-100 p-1 rounded-lg mb-2">
            <button 
              onClick={() => setView('list')}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${view === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              在庫リスト
            </button>
            <button 
              onClick={() => setView('add')}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1 ${view === 'add' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              <Plus size={14} /> 教科書を追加
            </button>
          </div>
        </div>

        {loading && (
          <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        )}

        <div className="p-2">
          {view === 'list' && (
            <>
              <div className="flex gap-2 mb-3 px-2">
                <div className="relative flex-grow">
                  <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="検索..." 
                    className="w-full pl-9 pr-2 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button onClick={fetchItems} className="px-3 bg-gray-100 rounded-lg text-gray-600 active:bg-gray-200">
                  <RotateCcw size={18} />
                </button>
              </div>

              <div className="flex gap-2 mb-3 px-2 overflow-x-auto pb-1">
                <SortButton label="追加順" active={sortMode === 'id'} onClick={() => setSortMode('id')} />
                <SortButton label="在庫少ない順" active={sortMode === 'stock'} onClick={() => setSortMode('stock')} />
                <SortButton label="名前順" active={sortMode === 'name'} onClick={() => setSortMode('name')} />
              </div>

              <div className="flex bg-[#222] text-white text-[10px] font-bold py-2 px-3 rounded-t mx-1">
                <div className="w-[80%]">教科書名 (タップして選択)</div>
                <div className="w-[20%] text-center">在庫</div>
              </div>

              <div className="pb-4">
                {filteredItems.map((item) => {
                  const isSelected = selectedItem?.商品ID === item.商品ID;
                  const isLow = item.現在在庫数 <= item.発注点;
                  
                  return (
                    <div 
                      key={item.商品ID} 
                      onClick={() => setSelectedItem(item)}
                      className={`
                        flex items-center p-3 border-b border-gray-100 mx-1 cursor-pointer transition-all duration-200
                        ${isSelected ? 'bg-green-50 border-l-4 border-l-green-500 pl-2' : 'bg-white hover:bg-gray-50 border-l-4 border-l-transparent'}
                      `}
                    >
                      <div className="w-[80%] pr-2">
                        <div className="font-bold text-[14px] leading-snug text-gray-800">{item.教科書名}</div>
                        <div className="text-[10px] text-gray-500 mt-1">{item.出版社}</div>
                      </div>
                      <div className="w-[20%] text-center flex flex-col items-center justify-center">
                        <span className={`text-[16px] font-bold ${isLow ? 'text-red-500' : 'text-gray-800'}`}>
                          {item.現在在庫数}
                        </span>
                        {isLow && <span className="text-[9px] text-red-500 font-bold bg-red-100 px-1 rounded mt-1">不足</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {view === 'add' && (
            <div className="p-4">
              <form onSubmit={handleAddItem} className="space-y-4">
                <InputGroup label="教科書名" value={newItem.name} onChange={(e: any) => setNewItem({...newItem, name: e.target.value})} placeholder="例: 高校数学I" required={true} />
                <InputGroup label="出版社" value={newItem.publisher} onChange={(e: any) => setNewItem({...newItem, publisher: e.target.value})} placeholder="例: 数研出版" required={true} />
                <div className="flex gap-3">
                  <InputGroup label="初期在庫" type="number" value={newItem.stock} onChange={(e: any) => setNewItem({...newItem, stock: Number(e.target.value)})} />
                  <InputGroup label="発注点" type="number" value={newItem.alert} onChange={(e: any) => setNewItem({...newItem, alert: Number(e.target.value)})} />
                </div>
                <div className="flex gap-3">
                  <InputGroup label="ISBN" value={newItem.isbn} onChange={(e: any) => setNewItem({...newItem, isbn: e.target.value})} />
                  <InputGroup label="保管場所" value={newItem.location} onChange={(e: any) => setNewItem({...newItem, location: e.target.value})} />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg mt-6 shadow-lg active:scale-95 transition-transform">
                  登録する
                </button>
              </form>
            </div>
          )}
        </div>

        {view === 'list' && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_15px_rgba(0,0,0,0.1)] p-3 pb-6 z-40">
            <div className="max-w-[600px] mx-auto">
              <div className="text-xs text-gray-500 mb-2 truncate px-1">
                選択中: <b className="text-black text-sm ml-1">{selectedItem ? selectedItem.教科書名 : "（リストから選択してください）"}</b>
              </div>

              <div className="flex gap-3 h-[45px]">
                <div className="w-[25%] relative">
                  <div className="absolute left-2 top-0 bottom-0 flex items-center pointer-events-none text-gray-400 font-bold text-xs">数</div>
                  <input 
                    type="number" 
                    min="1" 
                    value={qty} 
                    onChange={e => setQty(Math.max(1, Number(e.target.value)))}
                    className="w-full h-full text-center border-2 border-gray-200 rounded-lg font-bold text-lg focus:border-blue-500 outline-none pl-4 bg-white"
                  />
                </div>

                <ActionButton 
                  label="入庫" 
                  icon={<Package size={18} />} 
                  colorClass="text-green-600 border-green-600 hover:bg-green-50" 
                  disabled={!selectedItem} 
                  onClick={() => handleStockUpdate('入庫')} 
                />

                <ActionButton 
                  label="出庫" 
                  icon={<Archive size={18} />} 
                  colorClass="text-red-500 border-red-500 hover:bg-red-50" 
                  disabled={!selectedItem} 
                  onClick={() => handleStockUpdate('出庫')} 
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// エラーを消すために型定義を any にしています
const SortButton = ({ label, active, onClick }: any) => (
  <button 
    onClick={onClick} 
    className={`px-3 py-1 rounded-full border text-[10px] font-bold whitespace-nowrap transition-colors ${active ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200'}`}
  >
    {label}
  </button>
);

const InputGroup = ({ label, value, onChange, type = "text", placeholder, required }: any) => (
  <div className="flex-1">
    <label className="text-xs font-bold text-gray-500 ml-1">{label}</label>
    <input 
      type={type} 
      required={required}
      className="w-full border p-3 rounded-lg mt-1 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder}
    />
  </div>
);

const ActionButton = ({ label, icon, colorClass, disabled, onClick }: any) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`flex-1 font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1 border-2
      ${disabled 
        ? 'bg-gray-100 text-gray-300 border-transparent cursor-not-allowed' 
        : `bg-white ${colorClass}`}
    `}
  >
    {icon} {label}
  </button>
);