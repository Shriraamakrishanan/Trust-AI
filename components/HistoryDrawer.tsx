import React from 'react';
import { HistoryItem, RiskLevel } from '../types';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';
import InformationCircleIcon from './icons/InformationCircleIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import LinkIcon from './icons/LinkIcon';
import PhotoIcon from './icons/PhotoIcon';
import DocumentArrowUpIcon from './icons/DocumentArrowUpIcon';
import TrashIcon from './icons/TrashIcon';
import XMarkIcon from './icons/XMarkIcon';
import HistoryIcon from './icons/HistoryIcon';


interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onLoadHistory: (item: HistoryItem) => void;
  onClearHistory: () => void;
  onDeleteItem: (id: string) => void;
}

const TypeIcon: React.FC<{ type: string }> = ({ type }) => {
    const className = "w-5 h-5 text-[--text-secondary] flex-shrink-0";
    switch (type) {
        case 'text': return <DocumentTextIcon className={className} />;
        case 'url': return <LinkIcon className={className} />;
        case 'image': return <PhotoIcon className={className} />;
        case 'document': return <DocumentArrowUpIcon className={className} />;
        default: return <InformationCircleIcon className={className} />;
    }
}

const RiskIcon: React.FC<{ level: RiskLevel }> = ({ level }) => {
    const className="w-4 h-4";
    switch (level) {
        case RiskLevel.LOW: return <CheckCircleIcon className={`${className} text-[--success]`} />;
        case RiskLevel.MEDIUM: return <ExclamationTriangleIcon className={`${className} text-[--warning]`} />;
        case RiskLevel.HIGH: return <ExclamationTriangleIcon className={`${className} text-[--danger]`} />;
        default: return <InformationCircleIcon className={`${className} text-[--primary]`} />;
    }
}

const generateTitle = (item: HistoryItem): string => {
    const { originalType, originalContent, summary, sourceFileName } = item.result;
    
    const capitalize = (s: string) => s && s.charAt(0).toUpperCase() + s.slice(1);

    switch (originalType) {
        case 'url':
            try {
                const url = new URL(originalContent);
                let hostname = url.hostname.replace(/^www\./, '');
                const domainPart = hostname.split('.')[0];
                return capitalize(domainPart);
            } catch {
                const cleaned = originalContent.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
                const domainPart = cleaned.split('.')[0];
                return capitalize(domainPart);
            }
        case 'image':
            if (sourceFileName) {
                const firstWord = sourceFileName.split(/[\s._-]/)[0];
                return capitalize(firstWord);
            }
            const firstWordPrompt = originalContent.split(' ')[0];
            return capitalize(firstWordPrompt || "Image");

        case 'document':
             if (sourceFileName) {
                const firstWord = sourceFileName.split(/[\s._-]/)[0];
                return capitalize(firstWord);
            }
            return 'Document Analysis';

        case 'text':
            const words = originalContent.split(/\s+/);
            const shortText = words.slice(0, 5).join(' ');
            if (words.length > 5) {
                return capitalize(shortText) + '...';
            }
            return capitalize(shortText);
            
        default:
            return 'Analysis';
    }
};

const groupHistoryByDate = (history: HistoryItem[]) => {
    const groups: { [key: string]: HistoryItem[] } = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = today.toDateString();
    const yesterdayStr = yesterday.toDateString();

    history.forEach(item => {
        const itemDate = new Date(item.id);
        const itemDateStr = itemDate.toDateString();
        let groupKey: string;

        if (itemDateStr === todayStr) {
            groupKey = 'Today';
        } else if (itemDateStr === yesterdayStr) {
            groupKey = 'Yesterday';
        } else {
            groupKey = itemDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        }
        
        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(item);
    });

    return Object.entries(groups);
};

const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ isOpen, onClose, history, onLoadHistory, onClearHistory, onDeleteItem }) => {
  const groupedHistory = groupHistoryByDate(history);

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      ></div>
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-[--surface] border-l border-[--border] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
      >
        <div className="flex flex-col h-full">
          <header className="flex items-center justify-between p-4 border-b border-[--border] flex-shrink-0">
            <h2 id="history-title" className="text-xl font-bold text-[--text-primary]">Analysis History</h2>
            <button onClick={onClose} className="p-2 text-[--text-secondary] hover:bg-[--surface-muted] rounded-full" aria-label="Close history panel">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </header>

          <div className="flex-grow overflow-y-auto">
            {history.length > 0 ? (
              <div>
                {groupedHistory.map(([date, items]) => (
                  <div key={date}>
                    <h3 className="text-sm font-semibold text-[--text-secondary] bg-[--surface-muted] p-2 px-4 sticky top-0 z-10 border-b border-t border-[--border]">
                      {date}
                    </h3>
                    <ul>
                      {items.map(item => {
                        const title = generateTitle(item);
                        const fullTitle = item.result.originalType === 'text' || item.result.originalType === 'url' ? item.result.originalContent : item.result.sourceFileName || item.result.summary;
                        return (
                          <li key={item.id} className="group border-b border-[--border] last:border-b-0">
                            <div className="flex items-center justify-between hover:bg-[--surface-muted] transition-colors">
                              <button 
                                onClick={() => onLoadHistory(item)}
                                className="flex-grow text-left p-4 w-full overflow-hidden"
                              >
                                <div className="flex items-start space-x-3">
                                  <TypeIcon type={item.result.originalType} />
                                  <div className="flex-grow overflow-hidden">
                                    <p className="text-[--text-primary] truncate font-semibold" title={fullTitle}>
                                      {title}
                                    </p>
                                    <div className="flex items-center space-x-2 text-xs text-[--text-secondary] mt-1 capitalize">
                                      <RiskIcon level={item.result.riskLevel} />
                                      <span>{item.result.riskLevel.toLowerCase()}</span>
                                      <span>&middot;</span>
                                      <span>{new Date(item.id).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                  </div>
                                </div>
                              </button>
                              <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteItem(item.id);
                                }}
                                className="flex-shrink-0 p-2 mx-2 text-[--text-tertiary] hover:text-[--danger] rounded-full hover:bg-[--danger-soft] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                aria-label={`Delete entry titled ${title}`}
                              >
                                  <TrashIcon className="w-5 h-5" />
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-[--text-secondary] p-8">
                <HistoryIcon className="w-16 h-16 text-[--border] mb-4" />
                <h3 className="font-semibold text-lg text-[--text-primary]">No History Yet</h3>
                <p>Your past analyses will appear here.</p>
              </div>
            )}
          </div>
          {history.length > 0 && (
            <footer className="p-4 border-t border-[--border] flex-shrink-0 bg-[--background]">
              <button 
                onClick={onClearHistory}
                className="w-full flex items-center justify-center space-x-2 text-sm font-semibold text-[--danger] bg-[--danger-soft] hover:opacity-80 py-2 px-4 rounded-md transition-colors"
              >
                <TrashIcon className="w-5 h-5" />
                <span>Clear All History</span>
              </button>
            </footer>
          )}
        </div>
      </div>
    </>
  );
};

export default HistoryDrawer;