
import React, { useState, useEffect } from 'react';
import * as lc from '../services/lcService';
import { WeeklyMenu } from '../types';

interface HomePageProps {
  onEditMenu: () => void;
  isAdmin: boolean;
}

const HomePage: React.FC<HomePageProps> = ({ onEditMenu }) => {
  const [viewingWeek, setViewingWeek] = useState<'last' | 'current'>('current');
  const [menuData, setMenuData] = useState<Record<number, WeeklyMenu>>({});
  const [loading, setLoading] = useState(true);

  // ISO Week calculation logic
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
    const dayOfWeek = simple.getDay();
    const ISOweekStart = simple;
    if (dayOfWeek <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart;
  };

  const fmtDateRange = (d: Date) => {
    return `${(d.getMonth() + 1).toString().padStart(2, "0")}${d.getDate().toString().padStart(2, "0")}`;
  };

  const getWeekRangeText = (weekId: string) => {
    const monday = getDateOfISOWeek(weekId);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6); // 修改为显示周一至周日的范围
    return `${monday.getFullYear()}（${fmtDateRange(monday)}-${fmtDateRange(sunday)}周）`;
  };

  const today = new Date();
  const currentWeekID = getWeekID(today);
  const lastWeekDate = new Date(today);
  lastWeekDate.setDate(today.getDate() - 7);
  const lastWeekID = getWeekID(lastWeekDate);

  const weekId = viewingWeek === 'current' ? currentWeekID : lastWeekID;

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      try {
        const results = await lc.lcQuery<WeeklyMenu>("WeeklyMenu", { weekId }, "limit=100");
        const data: Record<number, WeeklyMenu> = {};
        results.forEach(item => {
          data[item.dayIndex] = item;
        });
        setMenuData(data);
      } catch (err) {
        console.error("Failed to fetch menu:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [weekId]);

  return (
    <div className="container mx-auto px-5 py-5 max-w-md">
      <div className="bg-[#FFF8E1] text-[#8D6E63] text-center text-sm font-bold p-3 rounded-xl mb-5 shadow-sm flex justify-center items-center gap-2">
        <i className="far fa-clock"></i>
        <span>{getWeekRangeText(weekId)}</span>
      </div>

      <div className="flex justify-between items-center mb-5 gap-3">
        <div className="flex overflow-x-auto gap-2.5 flex-1 scrollbar-hide">
          {[
            { id: 'current', label: '本周' },
            { id: 'last', label: '上周回顾' }
          ].map(week => (
            <button
              key={week.id}
              onClick={() => setViewingWeek(week.id as any)}
              className={`px-5 py-2 rounded-full text-[13px] font-extrabold whitespace-nowrap transition-all ${
                viewingWeek === week.id 
                  ? 'bg-[#FFBC0D] text-black shadow-lg shadow-[#FFBC0D]/30' 
                  : 'bg-white border border-gray-100 text-gray-400'
              }`}
            >
              {week.label}
            </button>
          ))}
        </div>
        <button 
          onClick={onEditMenu}
          className="w-10 h-10 bg-[#292929] text-[#FFBC0D] rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
        >
          <i className="fas fa-edit"></i>
        </button>
      </div>

      <div className="space-y-5">
        {loading ? (
          <div className="text-center py-20 text-gray-400">
             <i className="fas fa-spinner fa-spin mr-2"></i> 加载中...
          </div>
        ) : Object.keys(menuData).length === 0 ? (
          <div className="text-center py-20 text-gray-400 bg-white rounded-3xl shadow-sm italic">
             该时间段暂无菜单数据
          </div>
        ) : (
          // 这里补全了“周日”的渲染
          ['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((day, idx) => {
            const dayMenu = menuData[idx];
            if (!dayMenu) return null;
            
            // Calculate date for each day display
            const monday = getDateOfISOWeek(weekId);
            const cardDate = new Date(monday);
            cardDate.setDate(monday.getDate() + idx);
            const displayDate = `${(cardDate.getMonth() + 1).toString().padStart(2, '0')}.${cardDate.getDate().toString().padStart(2, '0')}`;

            return (
              <div key={day} className="bg-white rounded-[20px] shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-5">
                <div className="flex justify-between items-end border-b-2 border-dashed border-[#f0f0f0] pb-4 mb-4">
                  <span className="text-2xl font-black leading-none">{day}</span>
                  <span className="text-sm text-gray-400 font-bold">{displayDate}</span>
                </div>
                <div className="space-y-3">
                  <MenuRow label="主菜" color="bg-[#FFE082]" text={dayMenu.main} />
                  <MenuRow label="炒菜" color="bg-[#FFCCBC]" text={dayMenu.stir} />
                  <MenuRow label="时蔬" color="bg-[#C8E6C9]" text={dayMenu.veg} />
                  <MenuRow label="汤品" color="bg-[#B3E5FC]" text={dayMenu.soup} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const MenuRow: React.FC<{ label: string; color: string; text: string }> = ({ label, color, text }) => (
  <div className="flex items-center gap-3">
    <span className={`text-[11px] font-black px-2 py-1 rounded-md min-w-[42px] text-center ${color} text-[#5D4037]`}>
      {label}
    </span>
    <span className={`text-[15px] font-bold ${text ? 'text-[#292929]' : 'text-gray-200'}`}>
      {text || '--'}
    </span>
  </div>
);

export default HomePage;
