
import React, { useState, useEffect } from 'react';
import * as lc from '../services/lcService';
import { Recipe, RecipeSupport } from '../types';

interface RecipePageProps {
  userId: string;
  isAdmin: boolean;
}

const RecipePage: React.FC<RecipePageProps> = ({ userId, isAdmin }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [supports, setSupports] = useState<RecipeSupport[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // Form states
  const [dishName, setDishName] = useState('');
  const [ingredients, setIngredients] = useState<{ name: string; qty: string }[]>([{ name: '', qty: '' }]);
  const [steps, setSteps] = useState<string[]>(['']);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [recipeList, supportList] = await Promise.all([
        lc.lcQuery<Recipe>("Recipe", {}, "order=-createdAt&limit=1000"),
        lc.lcQuery<RecipeSupport>("RecipeSupport", {}, "limit=1000")
      ]);
      
      // 过滤掉特定不需要显示的菜品
      const excludedNames = ['鱼香鸡蛋', '快手炸酱面（1人份）'];
      const filteredList = recipeList.filter(r => !excludedNames.includes(r.name));
      
      setRecipes(filteredList);
      setSupports(supportList);
    } catch (err) {
      console.error("Fetch recipes failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const isMine = (authorId: string) => {
    if (!userId || !authorId) return false;
    // 强制转换为字符串并修剪空格，确保比对绝对精确
    return String(authorId).trim() === String(userId).trim();
  };

  const handleSupport = async (e: React.MouseEvent, recipeId: string) => {
    e.stopPropagation();
    const hasSupported = supports.some(s => s.recipeId === recipeId && s.userId === userId);
    if (hasSupported) return;

    try {
      await lc.lcCreate("RecipeSupport", { recipeId, userId });
      fetchData(); 
    } catch (err) {
      console.error("Support failed:", err);
    }
  };

  const handleDeleteRecipe = async (e: React.MouseEvent, recipeId: string) => {
    e.stopPropagation();
    if (!confirm("确定要删除这个食谱吗？")) return;
    try {
      await lc.lcDelete("Recipe", recipeId);
      fetchData();
    } catch (err) {
      console.error("Delete recipe failed:", err);
    }
  };

  const handleUploadSubmit = async () => {
    if (!dishName.trim()) return alert("请输入菜品名称");
    const validIngredients = ingredients.filter(i => i.name.trim());
    if (validIngredients.length === 0) return alert("请至少添加一个用料");
    const validSteps = steps.filter(s => s.trim());
    if (validSteps.length === 0) return alert("请至少填写一个步骤");

    setSaving(true);
    try {
      const currentId = localStorage.getItem('canteen_user_id') || userId;
      await lc.lcCreate("Recipe", {
        name: dishName.trim(),
        authorId: currentId,
        ingredients: validIngredients,
        steps: validSteps
      });
      alert("上传成功！");
      setUploadModalOpen(false);
      setDishName('');
      setIngredients([{ name: '', qty: '' }]);
      setSteps(['']);
      fetchData();
    } catch (err) {
      console.error("Upload failed:", err);
      alert("上传失败");
    } finally {
      setSaving(false);
    }
  };

  const filteredRecipes = activeTab === 'all' 
    ? recipes 
    : recipes.filter(r => isMine(r.authorId));

  return (
    <div className="container mx-auto px-5 py-5 max-w-md pb-10">
      <div className="flex bg-white rounded-2xl p-1 mb-6 shadow-sm border border-gray-50">
        <button 
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${activeTab === 'all' ? 'bg-[#FFBC0D] text-black shadow-sm' : 'text-gray-400'}`}
        >
          菜谱库
        </button>
        <button 
          onClick={() => setActiveTab('mine')}
          className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${activeTab === 'mine' ? 'bg-[#FFBC0D] text-black shadow-sm' : 'text-gray-400'}`}
        >
          我的分享
        </button>
      </div>

      <div className="flex flex-col gap-3 mb-8">
        <button 
          onClick={() => setUploadModalOpen(true)}
          className="w-full bg-[#292929] text-[#FFBC0D] py-4 rounded-2xl font-black text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <i className="fas fa-plus-circle"></i>
          上传菜谱
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-300">
          <i className="fas fa-spinner fa-spin text-3xl mb-4"></i>
          <div className="font-bold text-xs uppercase text-gray-400">同步数据库中...</div>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-100 italic text-gray-400 font-bold">
          暂无食谱记录
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecipes.map(recipe => {
            const supportCount = supports.filter(s => s.recipeId === recipe.objectId).length;
            const hasSupported = supports.some(s => s.recipeId === recipe.objectId && s.userId === userId);
            const myOwn = isMine(recipe.authorId);
            
            return (
              <div 
                key={recipe.objectId}
                onClick={() => { setSelectedRecipe(recipe); setDetailModalOpen(true); }}
                className={`bg-white p-5 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.04)] border flex justify-between items-center group active:scale-[0.98] transition-all ${myOwn ? 'border-[#FFBC0D]/40 ring-1 ring-[#FFBC0D]/10' : 'border-gray-50'}`}
              >
                <div className="flex-1 mr-4 overflow-hidden">
                  <h3 className="font-black text-lg text-[#292929] truncate">{recipe.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${myOwn ? 'text-[#FFBC0D]' : 'text-gray-300'}`}>
                      {myOwn ? '由我分享 (ME)' : '同事分享'}
                    </p>
                    {(myOwn || isAdmin) && (
                      <button 
                        onClick={(e) => handleDeleteRecipe(e, recipe.objectId)}
                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                      >
                        <i className="fas fa-trash-alt text-[10px]"></i>
                      </button>
                    )}
                  </div>
                </div>
                <button 
                  onClick={(e) => handleSupport(e, recipe.objectId)}
                  className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all shrink-0 ${hasSupported ? 'bg-[#FFF8E1] text-[#FFBC0D]' : 'bg-[#FAFAFA] text-gray-200'}`}
                >
                  <i className={`fas fa-fire text-lg ${hasSupported ? 'scale-110' : ''}`}></i>
                  <span className="text-[10px] font-black">{supportCount || '支持'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal Content */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end">
          <div className="bg-[#FAFAFA] w-full rounded-t-[32px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-6 bg-white border-b flex justify-between items-center shrink-0">
              <h2 className="font-black text-xl text-[#292929]">上传菜谱</h2>
              <button onClick={() => setUploadModalOpen(false)} className="text-2xl text-gray-400 p-2">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
              <section>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">1. 菜品名称</label>
                <input 
                  type="text" 
                  value={dishName}
                  onChange={e => setDishName(e.target.value)}
                  placeholder="请输入菜品名"
                  className="w-full bg-white border-2 border-transparent focus:border-[#FFBC0D] rounded-2xl px-5 py-4 font-bold text-lg outline-none shadow-sm transition-all"
                />
              </section>

              <section>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">2. 用料清单</label>
                  <button onClick={() => setIngredients([...ingredients, { name: '', qty: '' }])} className="text-[#FFBC0D] text-xs font-black flex items-center gap-1 p-1">
                    <i className="fas fa-plus"></i> 增加行
                  </button>
                </div>
                <div className="space-y-3">
                  {ingredients.map((ing, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="食材"
                        value={ing.name}
                        onChange={e => {
                          const n = [...ingredients];
                          n[idx].name = e.target.value;
                          setIngredients(n);
                        }}
                        className="flex-[2] bg-white rounded-xl px-4 py-3 text-sm font-bold shadow-sm"
                      />
                      <input 
                        type="text" 
                        placeholder="用量"
                        value={ing.qty}
                        onChange={e => {
                          const n = [...ingredients];
                          n[idx].qty = e.target.value;
                          setIngredients(n);
                        }}
                        className="flex-1 bg-white rounded-xl px-4 py-3 text-sm font-bold shadow-sm"
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">3. 烹饪步骤</label>
                  <button onClick={() => setSteps([...steps, ''])} className="text-[#FFBC0D] text-xs font-black flex items-center gap-1 p-1">
                    <i className="fas fa-plus"></i> 增加步骤
                  </button>
                </div>
                <div className="space-y-4 pb-10">
                  {steps.map((step, idx) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <span className="w-8 h-8 rounded-full bg-[#FFE082] flex items-center justify-center shrink-0 font-black text-xs text-[#5D4037]">
                        {idx + 1}
                      </span>
                      <textarea 
                        placeholder={`描述步骤 ${idx + 1}...`}
                        value={step}
                        onChange={e => {
                          const n = [...steps];
                          n[idx] = e.target.value;
                          setSteps(n);
                        }}
                        rows={2}
                        className="flex-1 bg-white rounded-2xl px-4 py-3 text-sm font-bold shadow-sm outline-none resize-none"
                      />
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="p-6 bg-white border-t shrink-0 safe-bottom">
              <button 
                onClick={handleUploadSubmit}
                disabled={saving}
                className="w-full bg-[#DA291C] text-white py-4 rounded-full font-black text-lg shadow-lg active:scale-95 transition-transform disabled:opacity-50"
              >
                {saving ? '正在上传...' : '确定上传'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailModalOpen && selectedRecipe && (
        <div className="fixed inset-0 bg-white z-[120] flex flex-col overflow-hidden animate-fade-in">
          <div className="px-5 py-6 flex justify-between items-center shrink-0 border-b">
            <button onClick={() => setDetailModalOpen(false)} className="text-gray-400 text-2xl p-2"><i className="fas fa-chevron-left"></i></button>
            <h2 className="font-black text-xl flex-1 text-center pr-10 text-[#292929] truncate">{selectedRecipe.name}</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-hide">
             <section>
                <div className="text-xs font-black text-gray-300 uppercase tracking-widest mb-4">用料清单</div>
                <div className="space-y-3">
                   {selectedRecipe.ingredients.map((ing, i) => (
                      <div key={i} className="flex justify-between border-b border-dashed border-gray-100 pb-2">
                         <span className="font-bold">{ing.name}</span>
                         <span className="text-[#FFBC0D] font-black">{ing.qty}</span>
                      </div>
                   ))}
                </div>
             </section>
             <section>
                <div className="text-xs font-black text-gray-300 uppercase tracking-widest mb-4">烹饪步骤</div>
                <div className="space-y-6 pb-10">
                   {selectedRecipe.steps.map((step, i) => (
                      <div key={i} className="flex gap-4">
                         <div className="w-6 h-6 rounded bg-black text-[#FFBC0D] flex items-center justify-center shrink-0 text-xs font-black">{i+1}</div>
                         <p className="font-bold text-[#292929]">{step}</p>
                      </div>
                   ))}
                </div>
             </section>
          </div>
          <div className="p-6 border-t safe-bottom flex gap-4">
             <button onClick={() => setDetailModalOpen(false)} className="w-full bg-[#DA291C] text-white py-4 rounded-full font-black text-lg shadow-lg">返回列表</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </div>
  );
};

export default RecipePage;
