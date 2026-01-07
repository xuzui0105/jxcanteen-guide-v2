
import React, { useState, useEffect } from 'react';
import * as lc from '../../services/lcService';
import { Category, Dish, WeeklyMenu } from '../../types';

interface MenuEditorModalProps {
  onClose: () => void;
}

const MenuEditorModal: React.FC<MenuEditorModalProps> = ({ onClose }) => {
  const [editTarget, setEditTarget] = useState<'current' | 'next'>('current');
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [menuData, setMenuData] = useState<Record<number, Partial<WeeklyMenu>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeCell, setActiveCell] = useState<{ day: number; cat: keyof WeeklyMenu } | null>(null);

  const getWeekID = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
  };

  const getDateOfISOWeek = (weekId: string) => {
    const [year, weekStr] = weekId.split("-W");
    const week = parseInt(weekStr);
    const simple = new Date(parseInt(year), 0, 1 + (week - 1) * 7);
    const ISOweekStart = simple;
    if (simple.getDay() <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart;
  };

  const fmtDateRange = (d: Date) => `${(d.getMonth() + 1).toString().padStart(2, "0")}${d.getDate().toString().padStart(2, "0")}`;

  const getWeekRange = (weekId: string) => {
    const start = getDateOfISOWeek(weekId);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${fmtDateRange(start)}-${fmtDateRange(end)}`;
  };

  const today = new Date();
  const currentWeekID = getWeekID(today);
  const nextWeekDate = new Date(today);
  nextWeekDate.setDate(today.getDate() + 7);
  const nextWeekID = getWeekID(nextWeekDate);

  const activeWeekID = editTarget === 'current' ? currentWeekID : nextWeekID;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [dishList, menuList] = await Promise.all([
        lc.lcQuery<Dish>("Dish", {}, "limit=1000"),
        lc.lcQuery<WeeklyMenu>("WeeklyMenu", { weekId: activeWeekID })
      ]);
      setDishes(dishList);
      
      const mappedMenu: Record<number, Partial<WeeklyMenu>> = {};
      menuList.forEach(m => { mappedMenu[m.dayIndex] = m; });
      setMenuData(mappedMenu);
      setLoading(false);
    };
    fetchData();
  }, [activeWeekID]);

  const handleOpenPicker = (day: number, cat: keyof WeeklyMenu) => {
    setActiveCell({ day, cat });
    setPickerOpen(true);
  };

  const handleSelectDish = (dishName: string) => {
    if (!activeCell) return;
    const { day, cat } = activeCell;
    setMenuData(prev => ({
      ...prev,
      [day]: { ...prev[day], [cat]: dishName }
    }));
    setPickerOpen(false);
    setActiveCell(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete existing for this week
      const existing = await lc.lcQuery<WeeklyMenu>("WeeklyMenu", { weekId: activeWeekID });
      await Promise.all(existing.map(e => lc.lcDelete("WeeklyMenu", e.objectId!)));

      // Create new
      const promises = Object.entries(menuData).map(([idx, data]) => {
        return lc.lcCreate("WeeklyMenu", {
          weekId: activeWeekID,
          dayIndex: parseInt(idx),
          main: data.main || "",
          stir: data.stir || "",
          veg: data.veg || "",
          soup: data.soup || ""
        });
      });
      await Promise.all(promises);
      alert("保存成功！");
      onClose();
    } catch (err) {
      console.error(err);
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const categories: { key: keyof WeeklyMenu; label: string; type: Category }[] = [
    { key: 'main', label: '主菜', type: Category.MAIN },
    { key: 'stir', label: '炒菜', type: Category.STIR },
    { key: 'veg', label: '时蔬', type: Category.VEG },
    { key: 'soup', label: '汤品', type: Category.SOUP }
  ];

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b flex justify-between items-center bg-[#FAFAFA]">
        <h2 className="font-black text-lg">编辑周菜单</h2>
        <button onClick={onClose} className="text-2xl">&times;</button>
      </div>

      <div className="flex bg-white border-b sticky top-0 z-10">
        <button 
          onClick={() => setEditTarget('current')}
          className={`flex-1 py-4 text-sm font-black border-b-2 transition-colors ${editTarget === 'current' ? 'border-[#FFBC0D] text-black' : 'border-transparent text-gray-400'}`}
        >
          1. 本周菜单<br/><span className="text-[10px] font-bold">({getWeekRange(currentWeekID)})</span>
        </button>
        <button 
          onClick={() => setEditTarget('next')}
          className={`flex-1 py-4 text-sm font-black border-b-2 transition-colors ${editTarget === 'next' ? 'border-[#FFBC0D] text-black' : 'border-transparent text-gray-400'}`}
        >
          2. 下周菜单<br/><span className="text-[10px] font-bold">({getWeekRange(nextWeekID)})</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 bg-[#F5F5F5] space-y-6">
        {loading ? (
          <div className="text-center py-20 text-gray-400 font-bold">加载数据中...</div>
        ) : (
          dayLabels.map((dayLabel, dayIdx) => (
            <div key={dayLabel} className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-black text-lg mb-4 text-[#292929]">{dayLabel}</h3>
              <div className="space-y-3">
                {categories.map(cat => (
                  <div key={cat.key} className="flex items-center gap-3">
                    <span className="text-[11px] font-black w-10 text-gray-400 text-center">{cat.label}</span>
                    <button 
                      onClick={() => handleOpenPicker(dayIdx, cat.key)}
                      className={`flex-1 p-3 rounded-xl border text-sm font-bold text-left truncate transition-colors ${
                        menuData[dayIdx]?.[cat.key] ? 'border-[#FFBC0D] bg-[#FFF8E1] text-black' : 'border-gray-100 bg-[#FAFAFA] text-gray-300'
                      }`}
                    >
                      {menuData[dayIdx]?.[cat.key] || `点击勾选${cat.label}`}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-5 border-t bg-white safe-bottom">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[#DA291C] text-white py-4 rounded-full font-black text-lg shadow-lg active:scale-95 transition-transform disabled:opacity-50"
        >
          {saving ? '正在保存...' : '确定保存'}
        </button>
      </div>

      {pickerOpen && activeCell && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-end">
          <div className="bg-white w-full rounded-t-3xl max-h-[80vh] flex flex-col">
            <div className="p-5 border-b flex justify-between items-center">
              <span className="font-black">选择 {categories.find(c => c.key === activeCell.cat)?.label}</span>
              <button onClick={() => setPickerOpen(false)} className="text-2xl">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleSelectDish("")}
                className="p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 font-bold text-sm"
              >
                (置空)
              </button>
              {dishes
                .filter(d => d.category === categories.find(c => c.key === activeCell.cat)?.type)
                .map(dish => (
                  <button
                    key={dish.objectId}
                    onClick={() => handleSelectDish(dish.name)}
                    className="p-4 bg-[#FAFAFA] rounded-2xl border-2 border-transparent hover:border-[#FFBC0D] active:bg-[#FFF8E1] transition-all text-sm font-black text-[#292929]"
                  >
                    {dish.name}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuEditorModal;
