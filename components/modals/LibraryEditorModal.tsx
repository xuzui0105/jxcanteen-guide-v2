
import React, { useState, useEffect } from 'react';
import * as lc from '../../services/lcService';
import { Category, Dish } from '../../types';

interface LibraryEditorModalProps {
  onClose: () => void;
}

const LibraryEditorModal: React.FC<LibraryEditorModalProps> = ({ onClose }) => {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDishNames, setNewDishNames] = useState<Record<string, string>>({
    [Category.MAIN]: '',
    [Category.STIR]: '',
    [Category.VEG]: '',
    [Category.SOUP]: ''
  });

  const categories = [
    { id: Category.MAIN, label: '主菜', icon: '🍖', color: 'bg-[#FFE082]' },
    { id: Category.STIR, label: '炒菜', icon: '🍳', color: 'bg-[#FFCCBC]' },
    { id: Category.VEG, label: '时蔬', icon: '🥦', color: 'bg-[#C8E6C9]' },
    { id: Category.SOUP, label: '汤品', icon: '🥣', color: 'bg-[#B3E5FC]' }
  ];

  const fetchDishes = async () => {
    setLoading(true);
    try {
      const results = await lc.lcQuery<Dish>("Dish", {}, "limit=1000");
      setDishes(results);
    } catch (err) {
      console.error("Fetch dishes failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDishes();
  }, []);

  const handleAddDish = async (category: Category) => {
    const name = newDishNames[category].trim();
    if (!name) return;

    // Strict duplicate check: Dish name should be unique in the entire library
    // or at least within its own category. Here we check global uniqueness for better data quality.
    const isDuplicate = dishes.some(d => d.name.toLowerCase() === name.toLowerCase());
    if (isDuplicate) {
      alert(`菜品库中已存在名为“${name}”的菜品，不可重复提交。`);
      return;
    }

    try {
      await lc.lcCreate("Dish", { name, category });
      // Reset input for this category
      setNewDishNames(prev => ({ ...prev, [category]: '' }));
      // Refresh list to show newly added item
      await fetchDishes();
    } catch (err) {
      console.error("Add dish failed:", err);
      alert('添加失败，请检查网络。');
    }
  };

  const handleDeleteDish = async (dish: Dish) => {
    if (!confirm(`确定要从库中永久删除“${dish.name}”吗？`)) return;
    try {
      await lc.lcDelete("Dish", dish.objectId);
      // Refresh list after deletion
      await fetchDishes();
    } catch (err) {
      console.error("Delete dish failed:", err);
      alert('删除失败');
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b flex justify-between items-center bg-[#FAFAFA] shrink-0">
        <div className="flex items-center gap-2">
          <i className="fas fa-edit text-[#FFBC0D]"></i>
          <h2 className="font-black text-lg text-[#292929]">编辑菜品库</h2>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors">
          <i className="fas fa-times text-xl"></i>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 bg-[#F8F9FA] space-y-6">
        {loading && dishes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <i className="fas fa-circle-notch fa-spin text-3xl mb-3"></i>
            <span className="font-bold">同步数据中...</span>
          </div>
        ) : (
          categories.map(cat => (
            <div key={cat.id} className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-5 overflow-hidden">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <span className={`w-10 h-10 rounded-full ${cat.color} flex items-center justify-center text-lg shadow-sm`}>
                    {cat.icon}
                  </span>
                  <h3 className="font-black text-lg text-[#292929]">{cat.label}</h3>
                </div>
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Category</span>
              </div>

              {/* Self-Upload Input Section */}
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newDishNames[cat.id]}
                  onChange={(e) => setNewDishNames(prev => ({ ...prev, [cat.id]: e.target.value }))}
                  placeholder={`输入${cat.label}名称...`}
                  className="flex-1 bg-[#F5F5F5] border-2 border-transparent focus:border-[#FFBC0D] focus:bg-white rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all placeholder:text-gray-300"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDish(cat.id)}
                />
                <button
                  onClick={() => handleAddDish(cat.id)}
                  className="bg-[#292929] text-[#FFBC0D] px-5 rounded-xl font-black text-sm active:scale-95 transition-transform shadow-md"
                >
                  上传
                </button>
              </div>

              {/* Already Saved Dish List Display */}
              <div className="space-y-2">
                <div className="text-[10px] font-black text-gray-400 mb-2 px-1">已保存的菜品</div>
                {dishes.filter(d => d.category === cat.id).length === 0 ? (
                  <div className="py-8 text-center bg-[#FAFAFA] rounded-2xl border-2 border-dashed border-gray-100">
                    <p className="text-xs text-gray-300 font-bold italic">暂无菜品数据</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {dishes.filter(d => d.category === cat.id).map(dish => (
                      <div 
                        key={dish.objectId}
                        className="flex justify-between items-center bg-[#FAFAFA] hover:bg-white px-4 py-3.5 rounded-xl border border-transparent hover:border-gray-100 transition-all group"
                      >
                        <span className="font-bold text-sm text-[#292929]">{dish.name}</span>
                        <button 
                          onClick={() => handleDeleteDish(dish)}
                          className="text-gray-200 hover:text-[#DA291C] group-hover:text-gray-300 transition-colors p-1"
                          title="删除"
                        >
                          <i className="fas fa-trash-can"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-5 border-t bg-white safe-bottom shrink-0 shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
        <button 
          onClick={onClose}
          className="w-full bg-[#DA291C] text-white py-4 rounded-full font-black text-lg shadow-lg active:scale-95 transition-transform"
        >
          确定并返回
        </button>
      </div>
    </div>
  );
};

export default LibraryEditorModal;
