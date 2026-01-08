
import React from 'react';

const Header: React.FC = () => {
  return (
    <header 
      className="bg-white px-5 sticky top-0 z-50 shadow-sm flex justify-between items-center transition-all border-b border-gray-50" 
      style={{ 
        // 关键：将安全区域填充应用到 Header 顶部
        paddingTop: 'calc(12px + env(safe-area-inset-top))', 
        paddingBottom: '12px' 
      }}
    >
      <div className="flex items-center gap-2 font-black text-xl">
        <i className="fas fa-bowl-food text-[#FFBC0D] text-2xl"></i>
        <span className="tracking-tight">聚芯食堂指南</span>
      </div>
      <div className="bg-[#F5F5F5] px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[10px] font-black text-[#666] uppercase tracking-wider">
        <span className="w-2 h-2 rounded-full bg-[#4CAF50] shadow-[0_0_8px_rgba(76,175,80,0.5)]"></span>
        在线
      </div>
    </header>
  );
};

export default Header;
