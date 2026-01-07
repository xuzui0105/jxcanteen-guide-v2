
import React, { useState, useEffect } from 'react';
import * as lc from '../services/lcService';
import { Dish, Category, Vote } from '../types';

interface LibraryPageProps {
  onEditLibrary: () => void;
  isAdmin: boolean;
}

const LibraryPage: React.FC<LibraryPageProps> = ({ onEditLibrary }) => {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dishResults, voteResults] = await Promise.all([
        lc.lcQuery<Dish>("Dish", {}, "limit=1000"),
        lc.lcQuery<Vote>("Vote", {}, "limit=1000")
      ]);
      setDishes(dishResults);
      setVotes(voteResults);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 获取所有历史计数的逻辑（不分轮次）
  const getHistoricalCounts = (dishId: string) => {
    const dishVotes = votes.filter(v => v.dishId === dishId);
    return {
      likes: dishVotes.filter(v => v.value === 1).length,
      dislikes: dishVotes.filter(v => v.value === -1).length
    };
  };

  const categories = [
    { id: Category.MAIN, label: '主菜 (Main)', icon: '🍖', color: 'bg-[#FFE082]' },
    { id: Category.STIR, label: '炒菜 (Stir-fry)', icon: '🍳', color: 'bg-[#FFCCBC]' },
    { id: Category.VEG, label: '时蔬 (Veg)', icon: '🥦', color: 'bg-[#C8E6C9]' },
    { id: Category.SOUP, label: '汤品 (Soup)', icon: '🥣', color: 'bg-[#B3E5FC]' }
  ];

  return (
    <div className="container mx-auto px-5 py-5 max-w-md pb-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-[#292929]">菜单总览</h2>
        <button 
          onClick={onEditLibrary}
          className="bg-black text-[#FFBC0D] px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 shadow-md active:scale-95 transition-transform"
        >
          <i className="fas fa-pen"></i>
          编辑库
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-300">
          <i className="fas fa-spinner fa-spin mr-2"></i> 同步数据库...
        </div>
      ) : (
        categories.map((cat) => (
          <section key={cat.id} className="mb-8">
            <div className="flex items-center gap-2 text-lg font-black mb-4">
              <span className={`w-8 h-8 rounded-full ${cat.color} flex items-center justify-center text-sm shadow-sm`}>
                {cat.icon}
              </span>
              {cat.label}
            </div>
            <div className="space-y-3">
              {dishes.filter(d => d.category === cat.id).length === 0 ? (
                <div className="p-4 bg-white/50 border border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-400 italic">
                  此分类暂无菜品
                </div>
              ) : (
                dishes.filter(d => d.category === cat.id).map(dish => {
                  const { likes, dislikes } = getHistoricalCounts(dish.objectId);
                  return (
                    <div key={dish.objectId} className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4 border border-gray-50">
                      <div className="w-12 h-12 bg-[#FAFAFA] rounded-xl flex items-center justify-center text-xl shrink-0">
                        {cat.icon}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="font-black text-base text-[#292929] truncate leading-tight">{dish.name}</div>
                        <div className="flex gap-4 text-[10px] font-extrabold mt-1.5 uppercase tracking-tighter">
                          <span className="text-[#FFBC0D] flex items-center gap-1 bg-[#FFF8E1] px-1.5 py-0.5 rounded-md">
                            <i className="fas fa-thumbs-up"></i> 累计 {likes}
                          </span>
                          <span className="text-[#DA291C] flex items-center gap-1 bg-[#FFEBEE] px-1.5 py-0.5 rounded-md">
                            <i className="fas fa-thumbs-down"></i> 累计 {dislikes}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        ))
      )}
    </div>
  );
};

export default LibraryPage;
