
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import UserIcon from './icons/UserIcon';
import SparklesIcon from './icons/SparklesIcon';
import PaperAirplaneIcon from './icons/PaperAirplaneIcon';

interface ChatAssistantProps {
  history: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  analysisType: 'text' | 'url' | 'image' | 'document';
}

const TypingIndicator: React.FC = () => (
  <div className="flex items-center space-x-1 p-3">
    <span className="w-2 h-2 bg-[--text-tertiary] rounded-full animate-pulse [animation-delay:-0.3s]"></span>
    <span className="w-2 h-2 bg-[--text-tertiary] rounded-full animate-pulse [animation-delay:-0.15s]"></span>
    <span className="w-2 h-2 bg-[--text-tertiary] rounded-full animate-pulse"></span>
  </div>
);

const ChatAssistant: React.FC<ChatAssistantProps> = ({ history, onSendMessage, isLoading, analysisType }) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, isLoading]);
  
  // Clear message input when the component is re-keyed for a new analysis
  useEffect(() => {
    setMessage('');
  }, [analysisType, history.length === 0]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };
  
  const getPlaceholderText = () => {
    switch(analysisType) {
      case 'document':
        return 'Ask anything about the document...';
      case 'image':
        return 'Ask a follow-up about the image...';
      default:
        return 'Ask a follow-up question...';
    }
  }

  return (
    <div className="bg-[--surface] rounded-xl shadow-lg border border-[--border] animate-fade-in">
       <header className="p-4 border-b border-[--border]">
        <h2 className="text-xl font-bold text-[--text-primary] text-center">
            Follow-up Assistant
        </h2>
       </header>
      <div className="p-4 md:p-6 space-y-4">
        <div className="h-96 overflow-y-auto pr-2 space-y-6 bg-[--background] rounded-md p-4 border border-[--border]">
          {history.map((chat, index) => (
            <div key={index} className={`flex items-start gap-3 ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {chat.role === 'model' && (
                <div className="w-8 h-8 rounded-full bg-[--primary-soft] flex items-center justify-center flex-shrink-0">
                  <SparklesIcon className="w-5 h-5 text-[--primary-soft-foreground]" />
                </div>
              )}
              <div className={`max-w-xl p-3 rounded-2xl ${chat.role === 'user' ? 'bg-[--primary] text-[--primary-foreground] rounded-br-lg' : 'bg-[--surface-muted] text-[--text-primary] rounded-bl-lg'}`}>
                <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: chat.text.replace(/\n/g, '<br />') }} />
              </div>
              {chat.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-[--surface-muted] flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-5 h-5 text-[--text-secondary]" />
                </div>
              )}
            </div>
          ))}
          {isLoading && history[history.length - 1]?.role === 'user' && (
             <div className="flex items-start gap-3">
               <div className="w-8 h-8 rounded-full bg-[--primary-soft] flex items-center justify-center flex-shrink-0">
                  <SparklesIcon className="w-5 h-5 text-[--primary-soft-foreground]" />
                </div>
                <div className="bg-[--surface-muted] rounded-lg">
                    <TypingIndicator />
                </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSubmit} className="flex items-center space-x-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={getPlaceholderText()}
            className="flex-grow p-3 bg-[--surface-muted] border border-[--border] rounded-full focus:ring-2 focus:ring-[--ring] focus:outline-none transition duration-200 disabled:opacity-50 placeholder:text-[--text-tertiary]"
            disabled={isLoading}
            aria-label="Your message"
          />
          <button
            type="submit"
            disabled={isLoading || !message.trim()}
            className="w-11 h-11 flex-shrink-0 flex items-center justify-center bg-[--primary] text-[--primary-foreground] font-bold rounded-full hover:bg-[--primary-hover] disabled:bg-[--text-tertiary] disabled:cursor-not-allowed transition-colors duration-200"
            aria-label="Send message"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatAssistant;