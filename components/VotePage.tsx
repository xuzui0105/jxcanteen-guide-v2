
import React, { useState, useEffect, useCallback } from 'react';
import * as lc from '../services/lcService';
import { Category, Dish, VotingConfig, Vote } from '../types';

interface VotePageProps {
  userId: string;
  onEditVote: () => void;
}

interface RankedDish extends Dish {
  likes: number;
  dislikes: number;
  myVote: number; // 0: none, 1: like, -1: dislike
  voting?: boolean;
}

const VotePage: React.FC<VotePageProps> = ({ userId, onEditVote }) => {
  const [loading, setLoading] = useState(true);
  const [rankedData, setRankedData] = useState<Record<Category, RankedDish[]>>({
    [Category.MAIN]: [],
    [Category.STIR]: [],
    [Category.VEG]: [],
    [Category.SOUP]: []
  });

  // 本地投票历史：{ [dishId]: value }
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

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
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

      // 获取最晚的配置时间，作为后端“本轮”的起始点
      const resetTime = configs.length > 0 
        ? Math.max(...configs.map(c => new Date(c.createdAt).getTime()))
        : 0;

      configs.forEach((c: any) => {
        const dishIds = (c.dishIds || []) as string[];
        const catDishes: RankedDish[] = dishIds
          .map(id => {
            const dish = dishMap.get(id);
            if (!dish) return null;

            // 后端本轮计票逻辑
            const sessionVotes = allVotes.filter(v => 
              v.dishId === id && 
              new Date(v.updatedAt).getTime() > resetTime
            );

            // 优先从本地历史获取我的投票状态，如果没有则看后端
            const myVoteFromLocal = localHistory[id] || 0;
            const myVoteRecord = sessionVotes.find(v => v.userId === userId);
            
            return {
              ...dish,
              likes: sessionVotes.filter(v => v.value === 1).length,
              dislikes: sessionVotes.filter(v => v.value === -1).length,
              myVote: myVoteFromLocal !== 0 ? myVoteFromLocal : (myVoteRecord ? myVoteRecord.value : 0)
            };
          })
          .filter(d => d !== null) as RankedDish[];
        
        catDishes.sort((a, b) => b.likes - a.likes);
        newRankedData[c.category as Category] = catDishes;
      });

      setRankedData(newRankedData);
    } catch (err) {
      console.error("Fetch voting data failed:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [userId, localHistory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVote = async (dishId: string, type: number, currentVote: number, category: Category) => {
    // 如果本地已经有投票记录，禁止重复投票
    if (localHistory[dishId]) return;
    
    const targetDish = rankedData[category].find(d => d.objectId === dishId);
    if (targetDish?.voting) return;

    // 乐观更新 UI：立即高亮并锁定
    const newHistory = { ...localHistory, [dishId]: type };
    setLocalHistory(newHistory);
    localStorage.setItem('user_voted_history', JSON.stringify(newHistory));

    setRankedData(prev => ({
      ...prev,
      [category]: prev[category].map(d => d.objectId === dishId ? { ...d, voting: true, myVote: type } : d)
    }));

    try {
      // 同步到后端
      const existingVotes = await lc.lcQuery<any>("Vote", { dishId, userId });
      if (existingVotes.length > 0) {
        await lc.lcUpdate("Vote", existingVotes[0].objectId, { value: type });
      } else {
        await lc.lcCreate("Vote", { dishId, userId, value: type });
      }
      // 静默刷新数据（更新总票数）
      await fetchData(false);
    } catch (err) {
      console.error("Voting failed:", err);
      await fetchData(false);
    }
  };

  const getRankBadgeClass = (index: number) => {
    if (index < 6) return 'bg-[#FFBC0D] text-black';
    return 'bg-gray-100 text-gray-400';
  };

  return (
    <div className="container mx-auto px-5 py-5 max-w-md pb-10">
      <div className="flex justify-between items-center mb-6">
        <div className="bg-[#FFF8E1] text-[#8D6E63] text-xs font-black px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
          <i className="fas fa-check-to-slot"></i>
          本轮人气榜
        </div>
        <button 
          onClick={onEditVote}
          className="w-10 h-10 bg-[#292929] text-[#FFBC0D] rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
        >
          <i className="fas fa-edit"></i>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-300">
          <i className="fas fa-spinner fa-spin text-3xl mb-4"></i>
          <span className="font-bold text-xs uppercase text-gray-400">正在同步状态...</span>
        </div>
      ) : Object.values(rankedData).every(arr => arr.length === 0) ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-100 p-8">
          <i className="fas fa-utensils text-4xl text-gray-100 mb-4"></i>
          <p className="text-gray-400 font-bold italic">本轮尚未配置投票菜品</p>
        </div>
      ) : (
        <div className="space-y-10">
          {categories.map(cat => (
            rankedData[cat.id].length > 0 && (
              <section key={cat.id}>
                <div className="flex items-center gap-2 text-lg font-black mb-4">
                  <span className={`w-10 h-10 rounded-full ${cat.color} flex items-center justify-center text-sm shadow-sm border border-black/5`}>
                    {cat.icon}
                  </span>
                  {cat.label}
                </div>
                <div className="space-y-3">
                  {rankedData[cat.id].map((dish, index) => {
                    const hasVoted = localHistory[dish.objectId] !== undefined;
                    
                    return (
                      <div 
                        key={dish.objectId} 
                        className={`bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4 border transition-all ${
                          dish.myVote !== 0 ? 'border-[#FFBC0D] ring-1 ring-[#FFBC0D]/20' : 'border-gray-50'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${getRankBadgeClass(index)}`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 font-black text-base text-[#292929] truncate">{dish.name}</div>
                        <div className="flex gap-2">
                          <button 
                            disabled={dish.voting || hasVoted}
                            onClick={() => handleVote(dish.objectId, 1, dish.myVote, cat.id)}
                            className={`flex flex-col items-center px-3 py-1.5 rounded-xl transition-all ${
                              dish.myVote === 1 ? 'bg-[#FFBC0D] text-black shadow-inner' : 'bg-[#FAFAFA] text-gray-300'
                            } ${hasVoted ? 'cursor-default opacity-80' : ''}`}
                          >
                            <i className="fas fa-thumbs-up text-sm"></i>
                            <span className="text-[9px] font-black mt-0.5">{dish.likes}</span>
                          </button>
                          <button 
                            disabled={dish.voting || hasVoted}
                            onClick={() => handleVote(dish.objectId, -1, dish.myVote, cat.id)}
                            className={`flex flex-col items-center px-3 py-1.5 rounded-xl transition-all ${
                              dish.myVote === -1 ? 'bg-[#DA291C] text-white shadow-inner' : 'bg-[#FAFAFA] text-gray-300'
                            } ${hasVoted ? 'cursor-default opacity-80' : ''}`}
                          >
                            <i className="fas fa-thumbs-down text-sm"></i>
                            <span className="text-[9px] font-black mt-0.5">{dish.dislikes}</span>
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
    </div>
  );
};

export default VotePage;
