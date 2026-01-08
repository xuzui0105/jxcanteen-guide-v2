
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import HomePage from './components/HomePage';
import VotePage from './components/VotePage';
import RecipePage from './components/RecipePage';
import LibraryPage from './components/LibraryPage';
import PasswordModal from './components/modals/PasswordModal';
import MenuEditorModal from './components/modals/MenuEditorModal';
import LibraryEditorModal from './components/modals/LibraryEditorModal';
import VoteEditorModal from './components/modals/VoteEditorModal';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'home' | 'vote' | 'recipe' | 'library'>('home');
  const [userId, setUserId] = useState<string>(() => {
    return localStorage.getItem('canteen_user_id') || "";
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isMenuEditorOpen, setIsMenuEditorOpen] = useState(false);
  const [isLibraryEditorOpen, setIsLibraryEditorOpen] = useState(false);
  const [isVoteEditorOpen, setIsVoteEditorOpen] = useState(false);
  const [adminTarget, setAdminTarget] = useState<'menu' | 'library' | 'vote' | null>(null);
  
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);
  const [voteRefreshKey, setVoteRefreshKey] = useState(0);

  useEffect(() => {
    let id = localStorage.getItem('canteen_user_id');
    if (!id) {
      id = "user_" + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('canteen_user_id', id);
    }
    setUserId(id);
  }, []);

  const handleRequestAdmin = (target: 'menu' | 'library' | 'vote') => {
    setAdminTarget(target);
    setIsPasswordModalOpen(true);
  };

  const handleVerifyAdmin = (password: string) => {
    if (password === "122333") {
      setIsAdmin(true);
      setIsPasswordModalOpen(false);
      if (adminTarget === 'menu') {
        setIsMenuEditorOpen(true);
      } else if (adminTarget === 'library') {
        setIsLibraryEditorOpen(true);
      } else if (adminTarget === 'vote') {
        setIsVoteEditorOpen(true);
      }
      setAdminTarget(null);
      return true;
    }
    return false;
  };

  return (
    <div className="min-h-screen flex flex-col pb-24 main-container">
      <Header />
      
      <main className="flex-1">
        {currentPage === 'home' && (
          <HomePage 
            key={homeRefreshKey}
            onEditMenu={() => handleRequestAdmin('menu')} 
            isAdmin={isAdmin} 
          />
        )}
        {currentPage === 'vote' && (
          <VotePage 
            key={voteRefreshKey}
            userId={userId} 
            onEditVote={() => handleRequestAdmin('vote')} 
          />
        )}
        {currentPage === 'recipe' && (
          <RecipePage 
            userId={userId} 
            isAdmin={isAdmin}
          />
        )}
        {currentPage === 'library' && (
          <LibraryPage 
            key={libraryRefreshKey}
            onEditLibrary={() => handleRequestAdmin('library')} 
            isAdmin={isAdmin} 
          />
        )}
      </main>

      <BottomNav currentPage={currentPage} onPageChange={setCurrentPage} />

      {isPasswordModalOpen && (
        <PasswordModal 
          onClose={() => {
            setIsPasswordModalOpen(false);
            setAdminTarget(null);
          }} 
          onVerify={handleVerifyAdmin} 
        />
      )}

      {isMenuEditorOpen && (
        <MenuEditorModal onClose={() => {
          setIsMenuEditorOpen(false);
          setHomeRefreshKey(prev => prev + 1);
        }} />
      )}

      {isLibraryEditorOpen && (
        <LibraryEditorModal onClose={() => {
          setIsLibraryEditorOpen(false);
          setLibraryRefreshKey(prev => prev + 1);
        }} />
      )}

      {isVoteEditorOpen && (
        <VoteEditorModal onClose={() => {
          setIsVoteEditorOpen(false);
          setVoteRefreshKey(prev => prev + 1);
        }} />
      )}
    </div>
  );
};

export default App;
