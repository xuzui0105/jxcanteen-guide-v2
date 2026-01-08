
import React, { useState, useEffect, useCallback } from 'react';
import * as lc from '../services/lcService';
import { Category, Dish, Vote } from '../types';

interface VotePageProps {
  userId: string;
  onEditVote: () => void;
}

interface RankedDish extends Dish {
  likes: number;
  dislikes: number;
  myVote: number; // 0: none, 1: like, -1: dislike
}

const VotePage: React.FC<VotePageProps> = ({ userId, onEditVote }) => {
  const [loading, setLoading] = useState(true);
  const [rankedData, setRankedData] = useState<Record<Category, RankedDish[]>>({
    [Category.MAIN]: [],
    [Category.STIR]: [],
    [Category.VEG]: [],
    [Category.SOUP]: []
  });

  // 本地投票状态缓存
  const [localHistory, setLocalHistory] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('user_voted_history');
    return saved ? JSON.parse(saved) : {};
  });

  const categories = [
    { id: Category.MAIN, label: '主菜', icon: '🍖', color: 'bg-[#FFE082]' },
    { id: Category.STIR, label: '炒菜', icon: '🍳', color: 'bg-[#FFCCBC]' },
    { id: Category.VEG, label: '时蔬', icon: '🥦', color: 'bg-[#C8E6C9]' },
    { id: Category.SOUP, label: '汤品', icon: '🥣', color: 'bg-[#B3E5FC]' }
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [configs, allDishes, allVotes] = await Promise.all([
        lc.lcQuery<any>("VotingConfig"),
        lc.lcQuery<Dish>("Dish", {}, "limit=1000"),
        lc.lcQuery<any>("Vote", {}, "limit=1000")
      ]);
      
      const dishMap = new Map(allDishes.map(d => [d.objectId, d]));
      const newRankedData: Record<Category, RankedDish[]> = {
        [Category.MAIN]: [],
        [Category.STIR]: [],
        [Category.VEG]: [],
        [Category.SOUP]: []
      };

      const resetTime = configs.length > 0 
        ? Math.max(...configs.map(c => new Date(c.createdAt).getTime()))
        : 0;

      configs.forEach((c: any) => {
        const dishIds = (c.dishIds || []) as string[];
        const catDishes: RankedDish[] = dishIds
          .map(id => {
            const dish = dishMap.get(id);
            if (!dish) return null;

            const sessionVotes = allVotes.filter(v => 
              v.dishId === id && 
              new Date(v.updatedAt).getTime() > resetTime
            );

            const myVoteRecord = sessionVotes.find(v => v.userId === userId);
            
            return {
              ...dish,
              likes: sessionVotes.filter(v => v.value === 1).length,
              dislikes: sessionVotes.filter(v => v.value === -1).length,
              myVote: myVoteRecord ? myVoteRecord.value : 0
            };
          })
          .filter(d => d !== null) as RankedDish[];
        
        catDishes.sort((a, b) => b.likes - a.likes);
        newRankedData[c.category as Category] = catDishes;
      });

      setRankedData(newRankedData);
      
      // 同步本地状态到本地存储
      const history: Record<string, number> = {};
      Object.values(newRankedData).flat().forEach(d => {
        if (d.myVote !== 0) history[d.objectId] = d.myVote;
      });
      setLocalHistory(history);
      localStorage.setItem('user_voted_history', JSON.stringify(history));

    } catch (err) {
      console.error("Fetch voting data failed:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVote = async (dishId: string, type: number, category: Category) => {
    const prevVote = localHistory[dishId] || 0;
    // 如果点击的是已选的按钮，则取消投票(0)；否则切换到新类型(1 或 -1)
    const newVote = prevVote === type ? 0 : type;

    // 1. 立即更新本地状态
    const newHistory = { ...localHistory };
    if (newVote === 0) delete newHistory[dishId];
    else newHistory[dishId] = newVote;
    setLocalHistory(newHistory);
    localStorage.setItem('user_voted_history', JSON.stringify(newHistory));

    // 2. 乐观更新 UI 票数并重新排序
    setRankedData(prev => {
      const updatedList = prev[category].map(d => {
        if (d.objectId === dishId) {
          let newLikes = d.likes;
          let newDislikes = d.dislikes;

          // 先撤销旧票的影响
          if (prevVote === 1) newLikes--;
          if (prevVote === -1) newDislikes--;

          // 再加上新票的影响
          if (newVote === 1) newLikes++;
          if (newVote === -1) newDislikes++;

          return { ...d, myVote: newVote, likes: newLikes, dislikes: newDislikes };
        }
        return d;
      });

      // 按喜欢人数降序排序
      updatedList.sort((a, b) => b.likes - a.likes);

      return { ...prev, [category]: updatedList };
    });

    // 3. 后台静默同步数据库
    try {
      const existing = await lc.lcQuery<any>("Vote", { dishId, userId });
      if (existing.length > 0) {
        if (newVote === 0) {
          await lc.lcDelete("Vote", existing[0].objectId);
        } else {
          await lc.lcUpdate("Vote", existing[0].objectId, { value: newVote });
        }
      } else if (newVote !== 0) {
        await lc.lcCreate("Vote", { dishId, userId, value: newVote });
      }
    } catch (err) {
      console.error("Background vote sync failed:", err);
    }
  };

  const getRankBadgeClass = (index: number) => {
    if (index === 0) return 'bg-[#FFBC0D] text-black ring-2 ring-[#FFBC0D]/20';
    if (index === 1) return 'bg-gray-200 text-gray-700';
    if (index === 2) return 'bg-[#8D6E63]/10 text-[#8D6E63]';
    return 'bg-gray-50 text-gray-300';
  };

  return (
    <div className="container mx-auto px-5 py-5 max-w-md pb-10">
      <div className="flex justify-between items-center mb-6">
        <div className="bg-[#FFF8E1] text-[#8D6E63] text-xs font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm border border-[#FFBC0D]/10">
          <i className="fas fa-fire-alt text-[#FFBC0D]"></i>
          实时热度榜
        </div>
        <button 
          onClick={onEditVote}
          className="w-10 h-10 bg-[#292929] text-[#FFBC0D] rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
        >
          <i className="fas fa-plus"></i>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-300">
          <i className="fas fa-circle-notch fa-spin text-3xl mb-4"></i>
          <span className="font-bold text-[10px] uppercase tracking-widest text-gray-400 text-center">正在同步最新投票...</span>
        </div>
      ) : Object.values(rankedData).every(arr => arr.length === 0) ? (
        <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-gray-100 p-8">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-utensils text-2xl text-gray-200"></i>
          </div>
          <p className="text-gray-400 font-bold italic">当前没有正在进行的投票</p>
        </div>
      ) : (
        <div className="space-y-12">
          {categories.map(cat => (
            rankedData[cat.id].length > 0 && (
              <section key={cat.id}>
                <div className="flex items-center justify-between mb-5 px-1">
                  <div className="flex items-center gap-2.5 text-lg font-black">
                    <span className={`w-9 h-9 rounded-xl ${cat.color} flex items-center justify-center text-sm shadow-sm border border-black/5`}>
                      {cat.icon}
                    </span>
                    {cat.label}
                  </div>
                </div>
                <div className="space-y-3.5">
                  {rankedData[cat.id].map((dish, index) => {
                    return (
                      <div 
                        key={dish.objectId} 
                        className={`bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4 border transition-all duration-500 ${
                          dish.myVote !== 0 ? 'border-[#FFBC0D] ring-2 ring-[#FFBC0D]/5' : 'border-gray-50'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] shrink-0 transition-all duration-500 ${getRankBadgeClass(index)}`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 font-black text-base text-[#292929] truncate tracking-tight">{dish.name}</div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleVote(dish.objectId, 1, cat.id)}
                            className={`flex flex-col items-center px-3 py-1.5 rounded-xl transition-all duration-300 active:scale-90 ${
                              dish.myVote === 1 
                                ? 'bg-[#FFBC0D] text-black shadow-md' 
                                : 'bg-[#FAFAFA] text-gray-300'
                            }`}
                          >
                            <i className={`fas fa-thumbs-up text-sm ${dish.myVote === 1 ? 'animate-bounce-short' : ''}`}></i>
                            <span className="text-[9px] font-black mt-0.5 leading-none">{dish.likes}</span>
                          </button>
                          <button 
                            onClick={() => handleVote(dish.objectId, -1, cat.id)}
                            className={`flex flex-col items-center px-3 py-1.5 rounded-xl transition-all duration-300 active:scale-90 ${
                              dish.myVote === -1 
                                ? 'bg-[#DA291C] text-white shadow-md' 
                                : 'bg-[#FAFAFA] text-gray-300'
                            }`}
                          >
                            <i className={`fas fa-thumbs-down text-sm ${dish.myVote === -1 ? 'animate-bounce-short' : ''}`}></i>
                            <span className="text-[9px] font-black mt-0.5 leading-none">{dish.dislikes}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )
          ))}
        </div>
      )}

      <style>{`
        @keyframes bounce-short {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-short {
          animation: bounce-short 0.5s ease-in-out 1;
        }
      `}</style>
    </div>
  );
};

export default VotePage;
