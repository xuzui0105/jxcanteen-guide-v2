
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white px-5 sticky top-0 z-50 shadow-sm flex justify-between items-center transition-all" style={{ paddingTop: 'calc(15px + env(safe-area-inset-top))', paddingBottom: '15px' }}>
      <div className="flex items-center gap-2 font-black text-xl">
        <i className="fas fa-bowl-food text-[#FFBC0D] text-2xl"></i>
        <span>聚芯食堂指南</span>
      </div>
      <div className="bg-[#F5F5F5] px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold text-[#666]">
        <span className="w-2 h-2 rounded-full bg-[#4CAF50]"></span>
        在线
      </div>
    </header>
  );
};

export default Header;
