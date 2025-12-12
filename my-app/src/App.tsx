import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, Plus, Package, Archive, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';

// ▼▼▼ あなたの最新URLです ▼▼▼
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxnney8Ahjm4L_hg2QuLHCzI7ZodTOP0sfsSRw5AiLT_rsOjnlN5OP2UqSWND864xtahg/exec";
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

// 学年の並び順定義（入力の選択肢用）
const GRADE_ORDER = [
  "小1", "小2", "小3", "小4", "小5", "小6",
  "中1", "中2", "中3",
  "高1", "高2", "高3"
];

interface Item {
  商品ID: number;
  教材名: string;
  教科: string;
  学年: string;
  現在在庫数: number;
  発注点: number;
  教材原価: number;
  在庫金額: number;
  // ★追加：スプレッドシートの並び順を記憶するための番号
  originalIndex: number;
}

interface NewItemState {
  name: string;
  subject: string;
  subjectManual: string;
  grade: string;        
  gradeManual: string;  
  stock: number | '';
  alert: number | '';
  cost: number | '';
}

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [view, setView] = useState<'list' | 'add'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 初期値は 'grade' ですが、これは実質「スプシ順」を意味することになります
  const [sortMode, setSortMode] = useState<'id' | 'stock' | 'name' | 'subject' | 'grade'>('grade');
  
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [qty, setQty] = useState<number | ''>(1);

  const [newItem, setNewItem] = useState<NewItemState>({
    name: '', 
    subject: '数学', 
    subjectManual: '', 
    grade: '中1',     
    gradeManual: '',  
    stock: 1, 
    alert: 1, 
    cost: 0
  });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${GAS_API_URL}?action=get`);
      const data = await response.json();
      
      // ★ここで「スプシの並び順 (index)」をデータに付与します
      const formattedData = data.map((item: any, index: number) => ({
        ...item,
        商品ID: Number(item.商品ID),
        現在在庫数: Number(item.現在在庫数),
        発注点: Number(item.発注点),
        教材原価: Number(item.教材原価),
        在庫金額: Number(item.在庫金額),
        originalIndex: index // 0, 1, 2... と順番を振る
      }));
      
      setItems(formattedData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const resetApp = () => {
    setView('list');
    setSearchQuery('');
    setSelectedItem(null);
    setSortMode('grade');
    setQty(1);
  };

  const handleStockUpdate = async (type: '入庫' | '出庫') => {
    if (!selectedItem) return;
    if (qty === '' || qty <= 0) {
        alert("有効な数量を入力してください");
        return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'update',
          id: selectedItem.商品ID,
          type: type,
          qty: Number(qty)
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        setQty(1);
        setSelectedItem(null);
        fetchItems();
      } else {
        alert(`エラー: ${result.message}`);
      }
    } catch (error) {
      alert("通信エラー");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    if (!window.confirm(`本当に「${selectedItem.教材名}」を削除しますか？\nこの操作は取り消せません。`)) return;

    setLoading(true);
    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'delete',
          id: String(selectedItem.商品ID)
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        setSelectedItem(null);
        fetchItems();
      } else {
        alert(`エラー: ${result.message}`);
      }
    } catch (error) {
      alert("通信エラー");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newItem.cost === '') {
        alert("教材原価を入力してください");
        return;
    }

    setLoading(true);
    
    const finalSubject = newItem.subject === 'その他' ? newItem.subjectManual : newItem.subject;
    const finalGrade = newItem.grade === 'その他' ? newItem.gradeManual : newItem.grade;

    try {
      const response = await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ 
          action: 'add', 
          name: newItem.name,
          subject: finalSubject,
          grade: finalGrade, 
          stock: newItem.stock === '' ? 0 : newItem.stock,
          alert: newItem.alert === '' ? 0 : newItem.alert,
          cost: newItem.cost
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        setNewItem({ 
          name: '', subject: '数学', subjectManual: '', 
          grade: '中1', gradeManual: '', 
          stock: 1, alert: 1, cost: 0 
        });
        setView('list');
        setSortMode('grade'); 
        fetchItems();
      } else {
        alert(`エラー: ${result.message}`);
      }
    } catch (error) {
      alert("通信エラー");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items
    .filter(item => 
      searchQuery === '' || 
      String(item.教材名).toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(item.教科).toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortMode === 'stock') return a.現在在庫数 - b.現在在庫数;
      if (sortMode === 'name') return a.教材名.localeCompare(b.教材名, 'ja');
      if (sortMode === 'subject') return a.教科.localeCompare(b.教科, 'ja');
      
      // ★修正：学年順のときは、スプレッドシートの順番(originalIndex)通りにする
      if (sortMode === 'grade') {
        return a.originalIndex - b.originalIndex;
      }

      return b.商品ID - a.商品ID;
    });

  return (
    <div className="min-h-screen pb-40 font-bold text-gray-800">
      <div className="max-w-[600px] mx-auto bg-white min-h-screen shadow-xl relative">
        
        {/* ヘッダー */}
        <div className="sticky top-0 bg-white z-10 border-b border-gray-200 px-4 pt-4 pb-2">
          <h1 onClick={resetApp} className="text-2xl font-black text-gray-900 mb-3 pl-2 cursor-pointer active:opacity-70 transition-opacity select-none">
            教科書在庫管理
          </h1>

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

        {/* ローディング */}
        {loading && (
          <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        )}

        <div className="p-2">
          {view === 'list' && (
            <>
              {/* 検索・更新 */}
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

              {/* ソートボタン */}
              <div className="flex gap-2 mb-3 px-2 overflow-x-auto pb-1">
                <SortButton label="学年順" active={sortMode === 'grade'} onClick={() => setSortMode('grade')} />
                <SortButton label="教科順" active={sortMode === 'subject'} onClick={() => setSortMode('subject')} />
                <SortButton label="名前順" active={sortMode === 'name'} onClick={() => setSortMode('name')} />
                <SortButton label="追加順" active={sortMode === 'id'} onClick={() => setSortMode('id')} />
                <SortButton label="在庫少ない順" active={sortMode === 'stock'} onClick={() => setSortMode('stock')} />
              </div>

              {/* リストヘッダー */}
              <div className="flex bg-[#222] text-white text-[10px] font-bold py-1 px-3 rounded-t mx-1">
                <div className="w-[75%]">教材名 (タップして選択)</div>
                <div className="w-[25%] text-center">在庫</div>
              </div>

              {/* 在庫リスト */}
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
                      <div className="w-[75%] pr-2">
                        <div className="font-bold text-[14px] leading-snug text-gray-800">
                          {item.教材名}
                          <span className="text-[11px] font-normal text-gray-500 ml-2">¥{item.教材原価.toLocaleString()}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1 flex gap-2">
                          <span className="bg-gray-100 px-1 rounded">{item.教科}</span>
                          <span className="bg-gray-100 px-1 rounded">{item.学年}</span>
                        </div>
                      </div>
                      <div className="w-[25%] text-center flex flex-col items-center justify-center">
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

          {/* 新規登録画面 */}
          {view === 'add' && (
            <div className="p-4">
              <form onSubmit={handleAddItem} className="space-y-4">
                <InputGroup 
                  label="教材名" 
                  value={newItem.name} 
                  onChange={(e: any) => setNewItem({...newItem, name: e.target.value})} 
                  placeholder="例: 高校数学I" 
                  required={true} 
                  showAsterisk={true}
                />
                
                {/* 教科選択 */}
                <div>
                  <label className="text-xs font-bold text-gray-500 ml-1">教科 <span className="text-red-500">*</span></label>
                  <select 
                    className="w-full border p-3 rounded-lg mt-1 bg-white"
                    value={newItem.subject}
                    onChange={e => setNewItem({...newItem, subject: e.target.value})}
                  >
                    <option value="数学">数学</option>
                    <option value="英語">英語</option>
                    <option value="論理">論理</option>
                    <option value="その他">その他 (手入力)</option>
                  </select>
                  {newItem.subject === 'その他' && (
                    <input 
                      type="text" 
                      className="w-full border p-3 rounded-lg mt-2 bg-gray-50"
                      placeholder="教科名を入力"
                      value={newItem.subjectManual}
                      onChange={e => setNewItem({...newItem, subjectManual: e.target.value})}
                      required
                    />
                  )}
                </div>

                {/* 学年選択 */}
                <div>
                  <label className="text-xs font-bold text-gray-500 ml-1">学年 <span className="text-red-500">*</span></label>
                  <select 
                    className="w-full border p-3 rounded-lg mt-1 bg-white"
                    value={newItem.grade}
                    onChange={e => setNewItem({...newItem, grade: e.target.value})}
                  >
                    {GRADE_ORDER.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                    <option value="その他">その他 (手入力)</option>
                  </select>
                  {newItem.grade === 'その他' && (
                    <input 
                      type="text" 
                      className="w-full border p-3 rounded-lg mt-2 bg-gray-50"
                      placeholder="学名を入力 (例: 既卒)"
                      value={newItem.gradeManual}
                      onChange={e => setNewItem({...newItem, gradeManual: e.target.value})}
                      required
                    />
                  )}
                </div>

                <div className="flex gap-3">
                  <InputGroup 
                    label="教材原価" 
                    type="number" 
                    value={newItem.cost} 
                    onChange={(e: any) => {
                        const val = e.target.value;
                        setNewItem({...newItem, cost: val === '' ? '' : Number(val)});
                    }} 
                    required 
                    showAsterisk
                    isError={newItem.cost === ''} 
                  />
                </div>

                <div className="flex gap-3">
                  <InputGroup 
                    label="初期在庫" 
                    type="number" 
                    value={newItem.stock} 
                    onChange={(e: any) => {
                        const val = e.target.value;
                        setNewItem({...newItem, stock: val === '' ? '' : Number(val)});
                    }}
                    isError={newItem.stock === ''} 
                  />
                  <InputGroup 
                    label="発注点" 
                    type="number" 
                    value={newItem.alert} 
                    onChange={(e: any) => {
                        const val = e.target.value;
                        setNewItem({...newItem, alert: val === '' ? '' : Number(val)});
                    }} 
                    isError={newItem.alert === ''}
                  />
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg mt-6 shadow-lg active:scale-95 transition-transform">
                  登録する
                </button>
              </form>
            </div>
          )}
        </div>

        {/* 固定フッター */}
        {view === 'list' && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_15px_rgba(0,0,0,0.1)] p-3 pb-6 z-40">
            <div className="max-w-[600px] mx-auto">
              <div className="text-xs text-gray-500 mb-2 truncate px-1">
                選択中: <b className="text-black text-sm ml-1">{selectedItem ? selectedItem.教材名 : "（リストから選択してください）"}</b>
              </div>

              <div className="flex gap-2 h-[45px]">
                {/* 数量入力 */}
                <div className={`w-[25%] flex border-2 rounded-lg overflow-hidden h-full bg-white relative ${qty === '' ? 'border-red-500' : 'border-gray-200'}`}>
                  <input 
                    type="number" 
                    min="1" 
                    value={qty} 
                    onChange={e => {
                        const val = e.target.value;
                        setQty(val === '' ? '' : Math.max(1, Number(val)));
                    }}
                    className="flex-1 h-full text-center font-bold text-lg outline-none px-1 w-full"
                    style={{ appearance: 'none', MozAppearance: 'textfield' }}
                  />
                   {/* 空欄時の警告 */}
                   {qty === '' && (
                      <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none flex items-center justify-center">
                          <span className="text-[8px] text-red-500 font-bold bg-white/90 px-1">※数を入力</span>
                      </div>
                  )}

                  <div className="flex flex-col w-6 border-l border-gray-200">
                    <button 
                      onClick={() => setQty(typeof qty === 'number' ? qty + 1 : 1)}
                      className="flex-1 flex items-center justify-center bg-gray-50 hover:bg-gray-100 active:bg-gray-200 border-b border-gray-200"
                    >
                      <ChevronUp size={12} className="text-gray-600" />
                    </button>
                    <button 
                      onClick={() => setQty(typeof qty === 'number' ? Math.max(1, qty - 1) : 1)}
                      className="flex-1 flex items-center justify-center bg-gray-50 hover:bg-gray-100 active:bg-gray-200"
                    >
                      <ChevronDown size={12} className="text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* ボタン群 */}
                <ActionButton 
                  label="入庫" 
                  icon={<Package size={16} />} 
                  colorClass="text-green-600 border-green-600 hover:bg-green-50" 
                  disabled={!selectedItem || qty === ''} 
                  onClick={() => handleStockUpdate('入庫')} 
                />

                <ActionButton 
                  label="出庫" 
                  icon={<Archive size={16} />} 
                  colorClass="text-blue-600 border-blue-600 hover:bg-blue-50" 
                  disabled={!selectedItem || qty === ''} 
                  onClick={() => handleStockUpdate('出庫')} 
                />

                <ActionButton 
                  label="削除" 
                  icon={<Trash2 size={16} />} 
                  colorClass="text-gray-500 border-gray-400 hover:bg-gray-100 bg-gray-50" 
                  disabled={!selectedItem} 
                  onClick={handleDelete} 
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const SortButton = ({ label, active, onClick }: any) => (
  <button 
    onClick={onClick} 
    className={`px-3 py-1 rounded-full border text-xs font-bold whitespace-nowrap transition-colors ${active ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200'}`}
  >
    {label}
  </button>
);

const InputGroup = ({ label, value, onChange, type = "text", placeholder, required, showAsterisk, isError }: any) => (
  <div className="flex-1 relative">
    <label className="text-xs font-bold text-gray-500 ml-1">
      {label}
      {showAsterisk && <span className="text-red-500 ml-1">*</span>}
    </label>
    <div className="relative">
        <input 
        type={type} 
        required={required}
        className={`w-full border p-3 rounded-lg mt-1 bg-gray-50 focus:bg-white focus:ring-2 outline-none transition-all 
            ${isError ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-blue-500'}
        `} 
        value={value} 
        onChange={onChange} 
        placeholder={placeholder}
        />
        {isError && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-red-500 font-bold bg-white px-1 pointer-events-none">
                ※数を入力してください
            </div>
        )}
    </div>
  </div>
);

const ActionButton = ({ label, icon, colorClass, disabled, onClick }: any) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={`flex-1 font-bold rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1 border-2 min-w-0 px-1
      ${disabled 
        ? 'bg-gray-100 text-gray-300 border-transparent cursor-not-allowed' 
        : `bg-white ${colorClass}`}
    `}
  >
    {icon} <span className="text-xs sm:text-sm">{label}</span>
  </button>
);