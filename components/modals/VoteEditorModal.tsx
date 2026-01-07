
import React, { useState, useEffect } from 'react';
import * as lc from '../../services/lcService';
import { Category, Dish, VotingConfig } from '../../types';

interface VoteEditorModalProps {
  onClose: () => void;
}

const VoteEditorModal: React.FC<VoteEditorModalProps> = ({ onClose }) => {
  const [library, setLibrary] = useState<Dish[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<Category, string[]>>({
    [Category.MAIN]: [],
    [Category.STIR]: [],
    [Category.VEG]: [],
    [Category.SOUP]: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Category>(Category.MAIN);

  const categories = [
    { id: Category.MAIN, label: '主菜', icon: '🍖', color: 'bg-[#FFE082]' },
    { id: Category.STIR, label: '炒菜', icon: '🍳', color: 'bg-[#FFCCBC]' },
    { id: Category.VEG, label: '时蔬', icon: '🥦', color: 'bg-[#C8E6C9]' },
    { id: Category.SOUP, label: '汤品', icon: '🥣', color: 'bg-[#B3E5FC]' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [libDishes, configs] = await Promise.all([
          lc.lcQuery<Dish>("Dish", {}, "limit=1000"),
          lc.lcQuery<VotingConfig>("VotingConfig")
        ]);
        setLibrary(libDishes);
        
        const initialSelected: Record<Category, string[]> = {
          [Category.MAIN]: [],
          [Category.STIR]: [],
          [Category.VEG]: [],
          [Category.SOUP]: []
        };
        configs.forEach(c => {
          initialSelected[c.category] = c.dishIds;
        });
        setSelectedIds(initialSelected);
      } catch (err) {
        console.error("Fetch data failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleSelection = (dishId: string) => {
    const currentList = selectedIds[activeTab];
    if (currentList.includes(dishId)) {
      setSelectedIds(prev => ({
        ...prev,
        [activeTab]: prev[activeTab].filter(id => id !== dishId)
      }));
    } else {
      if (currentList.length >= 10) {
        alert("每个板块最多只能挑选10道菜品");
        return;
      }
      setSelectedIds(prev => ({
        ...prev,
        [activeTab]: [...prev[activeTab], dishId]
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 物理删除旧配置，以此确保新创建的配置具有最新的 createdAt
      // VotePage 会通过对比 Vote.updatedAt > VotingConfig.createdAt 来实现计数重置
      const existing = await lc.lcQuery<VotingConfig>("VotingConfig");
      await Promise.all(existing.map(e => lc.lcDelete("VotingConfig", e.objectId!)));

      const promises = Object.entries(selectedIds).map(([cat, ids]) => {
        if (ids.length === 0) return Promise.resolve();
        return lc.lcCreate("VotingConfig", {
          category: cat as Category,
          dishIds: ids
        });
      });
      await Promise.all(promises);
      
      alert("投票设置已更新！投票页面的计数将重新开始。");
      onClose();
    } catch (err) {
      console.error("Save voting config failed:", err);
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("警告：这会从数据库物理删除所有人的所有点赞记录！如果您只想重置本轮计数，直接点下方的“确定并更新榜单”即可。是否继续彻底删除？")) return;
    setSaving(true);
    try {
      const [votes, logs] = await Promise.all([
        lc.lcQuery<any>("Vote", {}, "limit=1000"),
        lc.lcQuery<any>("VoteLog", {}, "limit=1000")
      ]);
      const deletePromises = [
        ...votes.map(v => lc.lcDelete("Vote", v.objectId!)),
        ...logs.map(l => lc.lcDelete("VoteLog", l.objectId!))
      ];
      await Promise.all(deletePromises);
      alert("所有历史投票记录已物理清除。");
      onClose();
    } catch (err) {
      console.error("Clear failed:", err);
      alert("重置失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b flex justify-between items-center bg-[#FAFAFA] shrink-0">
        <h2 className="font-black text-lg text-[#292929]">配置投票榜单</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors">
          <i className="fas fa-times text-xl"></i>
        </button>
      </div>

      <div className="flex bg-white border-b sticky top-0 z-10 shrink-0 shadow-sm">
        {categories.map(cat => (
          <button 
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`flex-1 py-4 flex flex-col items-center gap-1 border-b-2 transition-all ${
              activeTab === cat.id ? 'border-[#FFBC0D] text-black bg-[#FFF8E1]/10' : 'border-transparent text-gray-300'
            }`}
          >
            <span className="text-xl">{cat.icon}</span>
            <span className="text-[11px] font-black">{cat.label}</span>
            <span className="text-[9px] font-bold bg-[#F5F5F5] px-1.5 rounded-full text-gray-400 mt-1">
              {selectedIds[cat.id].length}/10
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5 bg-[#F8F9FA] space-y-4">
        {loading ? (
          <div className="text-center py-20 text-gray-400 font-bold">同步库数据...</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-4">
            {library
              .filter(d => d.category === activeTab)
              .map(dish => {
                const isSelected = selectedIds[activeTab].includes(dish.objectId);
                return (
                  <button
                    key={dish.objectId}
                    onClick={() => toggleSelection(dish.objectId)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between h-28 ${
                      isSelected 
                        ? 'bg-[#FFF8E1] border-[#FFBC0D] shadow-lg translate-y-[-2px]' 
                        : 'bg-white border-gray-100 opacity-60'
                    }`}
                  >
                    <div className="font-black text-xs leading-tight text-[#292929]">{dish.name}</div>
                    <div className="flex justify-end">
                      {isSelected ? (
                        <i className="fas fa-check-circle text-[#FFBC0D] text-lg scale-110"></i>
                      ) : (
                        <i className="far fa-circle text-gray-100 text-lg"></i>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        )}
      </div>

      <div className="p-5 border-t bg-white safe-bottom shrink-0 flex flex-col gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
        <button 
          onClick={handleClearHistory}
          disabled={saving}
          className="w-full bg-[#FAFAFA] text-gray-400 py-3 rounded-full font-black text-xs border border-gray-100 active:bg-red-50 active:text-red-500 transition-colors"
        >
          <i className="fas fa-trash-alt mr-1"></i> 彻底抹除所有历史记录
        </button>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#DA291C] text-white py-4 rounded-full font-black text-lg shadow-lg active:scale-95 transition-transform disabled:opacity-50"
        >
          {saving ? '保存设置中...' : '确定并更新榜单'}
        </button>
      </div>
    </div>
  );
};

export default VoteEditorModal;
