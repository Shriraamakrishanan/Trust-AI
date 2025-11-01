
import React from 'react';
import HistoryIcon from './icons/HistoryIcon';
import SunIcon from './icons/SunIcon';
import MoonIcon from './icons/MoonIcon';

interface HeaderProps {
  onToggleHistory: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleHistory, theme, onToggleTheme }) => {
  return (
    <header className="bg-[--surface] shadow-sm sticky top-0 z-20 border-b border-[--border]">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <svg className="w-8 h-8 text-[#4285F4]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            <h1 className="text-xl font-semibold text-[--text-primary] tracking-tight">
              Trust AI
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
                onClick={onToggleTheme}
                className="w-10 h-10 flex items-center justify-center text-sm font-medium text-[--text-secondary] bg-[--surface] hover:bg-[--surface-muted] rounded-full transition-colors"
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
                {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
            </button>
            <button
              onClick={onToggleHistory}
              className="w-10 h-10 flex items-center justify-center text-sm font-medium text-[--text-secondary] bg-[--surface] hover:bg-[--surface-muted] rounded-full transition-colors"
              aria-label="View history"
            >
              <HistoryIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;