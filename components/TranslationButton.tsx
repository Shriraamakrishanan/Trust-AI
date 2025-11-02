

import React, { useState, useMemo } from 'react';
import { translateText } from '../services/geminiService';
import LanguageIcon from './icons/LanguageIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

interface TranslationButtonProps {
  summary: string;
  highlights?: any[];
}

const languages = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh-CN', name: 'Mandarin' },
  { code: 'hi', name: 'Hindi' },
];

const formatHighlight = (highlight: any): string => {
    if (typeof highlight === 'string') {
        return highlight;
    }
    if (highlight && typeof highlight === 'object') {
        const suggestion = highlight.suggestion || highlight.title;
        const detail = highlight.detail || highlight.description;
        if (suggestion && detail) return `${suggestion}: ${detail}`;
        if (suggestion) return suggestion;
    }
    return JSON.stringify(highlight);
}

const TranslationButton: React.FC<TranslationButtonProps> = ({ summary, highlights }) => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  const originalText = useMemo(() => {
    const highlightsText = (highlights && highlights.length > 0) 
      ? `\n\nKey Highlights:\n${highlights.map(h => `- ${formatHighlight(h)}`).join('\n')}`
      : '';
    return `${summary}${highlightsText}`;
  }, [summary, highlights]);
  
  const handleTranslate = async (langName: string) => {
    setShowDropdown(false);
    setIsTranslating(true);
    setError(null);
    setTranslatedText(null);
    
    try {
      const translation = await translateText(originalText, langName);
      setTranslatedText(translation);
      setShowOriginal(false);
    } catch (err: any) {
      setError(err.message || 'Translation failed.');
    } finally {
      setIsTranslating(false);
    }
  };
  
  const handleToggleView = () => {
    setShowOriginal(!showOriginal);
  }

  return (
    <div className="space-y-4">
      <div className="relative inline-block text-left">
        <div>
          <button
            type="button"
            className="inline-flex items-center justify-center space-x-2 text-sm font-semibold text-[--primary] hover:text-[--primary-hover] disabled:opacity-50 transition-colors py-2 px-4 rounded-md hover:bg-[--surface-muted] border border-transparent hover:border-[--border]"
            onClick={() => {
                if (translatedText) {
                    handleToggleView();
                } else {
                    setShowDropdown(!showDropdown)
                }
            }}
            disabled={isTranslating}
          >
            <LanguageIcon className="w-5 h-5" />
            <span>{isTranslating ? 'Translating...' : (translatedText && !showOriginal) ? 'Show Original' : 'Translate'}</span>
          </button>
        </div>
        
        {showDropdown && (
          <div className="origin-top-left absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-[--surface] ring-1 ring-[--border] z-10">
            <div className="py-1" role="menu" aria-orientation="vertical">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleTranslate(lang.name)}
                  className="block w-full text-left px-4 py-2 text-sm text-[--text-primary] hover:bg-[--surface-muted]"
                  role="menuitem"
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-[--danger]">{error}</p>}
      
      <div className="text-base text-[--text-secondary] whitespace-pre-wrap leading-relaxed">
        {(translatedText && !showOriginal) ? (
            <p>{translatedText}</p>
        ) : (
            <>
              <p>{summary}</p>
              {highlights && highlights.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-base font-semibold text-[--text-primary] mb-3">Key Highlights</h4>
                  <ul className="space-y-3">
                    {highlights.map((highlight, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <CheckCircleIcon className="w-5 h-5 text-[--success] flex-shrink-0 mt-1" />
                        <span className="text-[--text-secondary]">{formatHighlight(highlight)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
        )}
      </div>
    </div>
  );
};

export default TranslationButton;
