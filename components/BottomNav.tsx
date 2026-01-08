
import React from 'react';

interface BottomNavProps {
  currentPage: string;
  onPageChange: (page: any) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentPage, onPageChange }) => {
  const navItems = [
    { id: 'home', icon: 'fa-calendar-alt', label: '本周' },
    { id: 'vote', icon: 'fa-thumbs-up', label: '投票' },
    { id: 'recipe', icon: 'fa-book-open', label: '菜谱' },
    { id: 'library', icon: 'fa-utensils', label: '菜单' },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 w-full bg-white px-5 flex justify-around shadow-[0_-8px_30px_rgba(0,0,0,0.06)] rounded-t-[32px] z-[60] border-t border-gray-100"
      style={{
        paddingTop: '12px',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom))'
      }}
    >
      {navItems.map((item) => {
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id)}
            className={`flex flex-col items-center gap-1.5 transition-all duration-300 relative py-1 ${
              isActive ? 'text-[#DA291C]' : 'text-gray-300'
            }`}
          >
            <div className={`relative flex items-center justify-center transition-all duration-300 ${isActive ? 'scale-110 -translate-y-1' : ''}`}>
              <i className={`fas ${item.icon} text-xl`}></i>
              {isActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#FFBC0D] rounded-full ring-2 ring-white"></span>
              )}
            </div>
            <span className={`text-[11px] font-black transition-all ${isActive ? 'opacity-100' : 'opacity-80'}`}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
