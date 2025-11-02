import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import UserIcon from './icons/UserIcon';
import SparklesIcon from './icons/SparklesIcon';
import PaperAirplaneIcon from './icons/PaperAirplaneIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import XMarkIcon from './icons/XMarkIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';

interface GeneralChatProps {
  isOpen: boolean;
  onClose: () => void;
  history: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const TypingIndicator: React.FC = () => (
    <div className="flex items-center space-x-1 p-3">
      <span className="w-2 h-2 bg-[--text-tertiary] rounded-full animate-pulse [animation-delay:-0.3s]"></span>
      <span className="w-2 h-2 bg-[--text-tertiary] rounded-full animate-pulse [animation-delay:-0.15s]"></span>
      <span className="w-2 h-2 bg-[--text-tertiary] rounded-full animate-pulse"></span>
    </div>
);

const GeneralChat: React.FC<GeneralChatProps> = ({ isOpen, onClose, history, onSendMessage, isLoading }) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isSpeechRecognitionSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [history, isLoading, isOpen]);
  
  useEffect(() => {
    if (!isSpeechRecognitionSupported) return;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      setMessage(prev => (prev ? prev.trim() + ' ' : '') + transcript);
    };
    
    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isSpeechRecognitionSupported]);

  const handleListen = () => {
    if (isLoading || !recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch(e) {
        console.error("Error starting speech recognition:", e);
        setIsListening(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };
  
  const isInputDisabled = isLoading || isListening;

  return (
    <div className={`fixed bottom-24 right-6 w-[calc(100%-3rem)] max-w-md bg-[--surface] rounded-2xl shadow-2xl border border-[--border] z-40 flex flex-col transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="general-chat-title"
    >
      <header className="flex items-center justify-between p-3 border-b border-[--border] flex-shrink-0">
        <h2 id="general-chat-title" className="text-lg font-bold text-[--text-primary] ml-2">Trust AI Assistant</h2>
        <button onClick={onClose} className="p-2 text-[--text-secondary] hover:bg-[--surface-muted] rounded-full" aria-label="Close chat panel">
          <ChevronDownIcon className="w-6 h-6" />
        </button>
      </header>
      
      <div className="flex-grow h-96 overflow-y-auto p-4 space-y-6">
          {history.map((chat, index) => (
            <div key={index} className={`flex items-start gap-3 ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {chat.role === 'model' && (
                <div className="w-8 h-8 rounded-full bg-[--primary-soft] flex items-center justify-center flex-shrink-0">
                  <SparklesIcon className="w-5 h-5 text-[--primary-soft-foreground]" />
                </div>
              )}
              <div className={`max-w-xs p-3 rounded-2xl ${chat.role === 'user' ? 'bg-[--primary] text-[--primary-foreground] rounded-br-lg' : 'bg-[--surface-muted] text-[--text-primary] rounded-bl-lg'}`}>
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

      <div className="p-3 border-t border-[--border] bg-[--surface]">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <div className="relative flex-grow">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about Trust AI..."
              className="w-full p-3 pr-12 bg-[--surface-muted] border border-[--border] rounded-full focus:ring-2 focus:ring-[--ring] focus:outline-none transition duration-200 disabled:opacity-50 placeholder:text-[--text-tertiary]"
              disabled={isInputDisabled}
              aria-label="Your message"
            />
             {isSpeechRecognitionSupported && (
              <button
                type="button"
                onClick={handleListen}
                disabled={isLoading}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--ring] ${
                  isListening
                  ? 'bg-[--danger-soft] text-[--danger] scale-110'
                  : 'bg-transparent text-[--text-secondary] hover:bg-[--border]'
                }`}
                aria-label={isListening ? 'Stop listening' : 'Start listening'}
              >
                <MicrophoneIcon className="w-5 h-5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={isInputDisabled || !message.trim()}
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

export default GeneralChat;