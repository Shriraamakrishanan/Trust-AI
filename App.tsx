// Build and Developed by : Shri Raama Krishanan J 
// Gmail Id: srkavp2006@gmail.com
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import AnalysisCard from './components/AnalysisCard';
import EducationalAccordion from './components/EducationalAccordion';
import ChatAssistant from './components/ChatAssistant';
import HistoryDrawer from './components/HistoryDrawer';
import WelcomeModal from './components/WelcomeModal';
import { AnalysisResult, educationalContent, ChatMessage, HistoryItem } from './types';
import { analyzeContent, startChat, startGeneralChat } from './services/geminiService';
import { Chat } from '@google/genai';
import TransparencyModal from './components/TransparencyModal';
import InfoDrawer from './components/InfoDrawer';
import GeneralChat from './components/GeneralChat';
import ChatBubbleOvalLeftEllipsisIcon from './components/icons/ChatBubbleOvalLeftEllipsisIcon';

type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Analysis Chat State
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // General Assistant State
  const [isGeneralChatOpen, setIsGeneralChatOpen] = useState<boolean>(false);
  const [generalChatSession, setGeneralChatSession] = useState<Chat | null>(null);
  const [generalChatHistory, setGeneralChatHistory] = useState<ChatMessage[]>([]);
  const [isGeneralChatLoading, setIsGeneralChatLoading] = useState<boolean>(false);

  // History State
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [userHistory, setUserHistory] = useState<HistoryItem[]>([]);

  // Theme state
  const [theme, setTheme] = useState<Theme>('dark');
  
  // Welcome Modal state
  const [showWelcome, setShowWelcome] = useState<boolean>(false);

  // Transparency Modal state
  const [isTransparencyOpen, setIsTransparencyOpen] = useState<boolean>(false);

  // Info Drawer state
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState<boolean>(false);


  useEffect(() => {
    const storedTheme = localStorage.getItem('trust_ai_theme') as Theme | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = storedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    
    const hasVisited = localStorage.getItem('trust_ai_has_visited');
    if (!hasVisited) {
        setShowWelcome(true);
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('trust_ai_theme', theme);
  }, [theme]);

  useEffect(() => {
    // Load history from localStorage
    const storedHistory = localStorage.getItem('trust_ai_history');
    if (storedHistory) {
      setUserHistory(JSON.parse(storedHistory));
    }
  }, []);
  
  const handleCloseWelcome = () => {
    localStorage.setItem('trust_ai_has_visited', 'true');
    setShowWelcome(false);
  };

  const saveHistory = (newResult: AnalysisResult, newChatHistory: ChatMessage[]) => {
    const newHistoryItem: HistoryItem = {
      id: new Date().toISOString(),
      timestamp: new Date().toLocaleString(),
      result: newResult,
      chatHistory: newChatHistory,
    };
    const updatedHistory = [newHistoryItem, ...userHistory];
    setUserHistory(updatedHistory);
    localStorage.setItem('trust_ai_history', JSON.stringify(updatedHistory));
  };
  
  const handleAnalysis = async (content: string, type: 'text' | 'url' | 'image' | 'document', files?: File | File[]) => {
    // Clear previous state
    setIsLoading(true);
    setResult(null);
    setError(null);
    setChatSession(null);
    setChatHistory([]);
    
    // Basic validation
    if (type === 'text' && !content.trim()) {
      setError(`Please enter text to analyze.`);
      setIsLoading(false);
      return;
    }
    if(type === 'url' && !content.trim()){
      setError(`Please enter a URL to analyze.`);
      setIsLoading(false);
      return;
    }
    if((type === 'image' || type === 'document') && (!files || (Array.isArray(files) && files.length === 0))) {
        setError(`Please upload at least one ${type} to analyze.`);
        setIsLoading(false);
        return;
    }

    try {
      const analysisResult = await analyzeContent(content, type, files);
      setResult(analysisResult);
      const chat = startChat(analysisResult);
      setChatSession(chat);

      // Save to history
      saveHistory(analysisResult, []);

    } catch (err: any) {
      setError(err.message || `An error occurred while analyzing the ${type}. Please try again.`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!chatSession || isChatLoading) return;

    setIsChatLoading(true);
    const updatedHistory: ChatMessage[] = [...chatHistory, { role: 'user', text: message }];
    setChatHistory(updatedHistory);

    try {
      const response = await chatSession.sendMessageStream({ message });
      
      let modelResponse = '';
      setChatHistory([...updatedHistory, { role: 'model', text: '' }]);

      for await (const chunk of response) {
        modelResponse += chunk.text;
        setChatHistory([
          ...updatedHistory,
          { role: 'model', text: modelResponse }
        ]);
      }

      // Update the latest history item with the new chat messages
      if (userHistory.length > 0) {
        const latestHistoryItem = userHistory[0];
        // FIX: Explicitly type finalChatHistory to prevent type widening on the 'role' property.
        const finalChatHistory: ChatMessage[] = [...updatedHistory, { role: 'model', text: modelResponse }];
        const updatedHistoryItem = { ...latestHistoryItem, chatHistory: finalChatHistory };
        const newHistory = [updatedHistoryItem, ...userHistory.slice(1)];
        setUserHistory(newHistory);
        localStorage.setItem('trust_ai_history', JSON.stringify(newHistory));
      }

    } catch (err) {
      console.error("Error sending chat message:", err);
      // FIX: Explicitly type errorHistory to prevent type widening on the 'role' property.
      const errorHistory: ChatMessage[] = [
        ...updatedHistory,
        { role: 'model', text: "Sorry, I encountered an error. Please try again." }
      ];
      setChatHistory(errorHistory);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleToggleGeneralChat = () => {
    setIsGeneralChatOpen(prev => {
      const isOpening = !prev;
      if (isOpening && !generalChatSession) {
        const chat = startGeneralChat();
        setGeneralChatSession(chat);
        
        // FIX: The `history` property of a Chat object is private.
        // The initial message is static, so we can set it directly here.
        setGeneralChatHistory([{ role: 'model', text: "Hello! I'm the Trust AI assistant. How can I help you understand this application and its features today?" }]);
      }
      return isOpening;
    });
  };

  const handleSendGeneralMessage = async (message: string) => {
    if (!generalChatSession || isGeneralChatLoading) return;

    setIsGeneralChatLoading(true);
    const updatedHistory: ChatMessage[] = [...generalChatHistory, { role: 'user', text: message }];
    setGeneralChatHistory(updatedHistory);

    try {
      const response = await generalChatSession.sendMessageStream({ message });
      
      let modelResponse = '';
      setGeneralChatHistory([...updatedHistory, { role: 'model', text: '' }]);

      for await (const chunk of response) {
        modelResponse += chunk.text;
        setGeneralChatHistory([
          ...updatedHistory,
          { role: 'model', text: modelResponse }
        ]);
      }
    } catch (err) {
      console.error("Error sending general chat message:", err);
      const errorHistory: ChatMessage[] = [
        ...updatedHistory,
        { role: 'model', text: "Sorry, I encountered an error. Please try again." }
      ];
      setGeneralChatHistory(errorHistory);
    } finally {
      setIsGeneralChatLoading(false);
    }
  };

  const handleLoadHistory = (item: HistoryItem) => {
    setResult(item.result);
    setChatHistory(item.chatHistory);
    const chat = startChat(item.result);
    setChatSession(chat);
    setIsHistoryOpen(false);
    setError(null);
  };
  
  const handleClearHistory = () => {
    setUserHistory([]);
    localStorage.removeItem('trust_ai_history');
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updatedHistory = userHistory.filter(item => item.id !== id);
    setUserHistory(updatedHistory);
    localStorage.setItem('trust_ai_history', JSON.stringify(updatedHistory));
  };

  const handleToggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleToggleTransparency = () => {
    setIsTransparencyOpen(!isTransparencyOpen);
  };

  return (
    <>
      <div className="min-h-screen font-sans flex flex-col">
        <Header 
          onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
          onToggleInfoDrawer={() => setIsInfoDrawerOpen(!isInfoDrawerOpen)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          showTransparencyButton={!!result?.transparencyReport}
          onToggleTransparency={handleToggleTransparency}
        />
        <main className="container mx-auto p-4 md:p-8 flex-grow w-full flex flex-col justify-center">
          <div className="max-w-4xl mx-auto">
            <div className="mb-10 text-center">
                <h1 className="text-4xl md:text-5xl font-bold text-[--text-primary] tracking-tight">
                    AI-Powered Content Analysis
                </h1>
                <p className="mt-4 text-lg text-[--text-secondary] max-w-3xl mx-auto">
                    Enter a news headline, URL, or upload a document. Our secured research assistant will analyze it for potential signs of misinformation and provide a detailed breakdown.
                </p>
            </div>
            
            <AnalysisCard
              onAnalyze={handleAnalysis}
              isLoading={isLoading}
              result={result}
              error={error}
            />

            {result && (
              <div className="mt-12">
                <ChatAssistant 
                  key={result.originalContent} // Re-mount component when result changes
                  history={chatHistory}
                  onSendMessage={handleSendMessage}
                  isLoading={isChatLoading}
                  analysisType={result.originalType}
                />
              </div>
            )}
          </div>
        </main>
        <div className="container mx-auto p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
              <EducationalAccordion items={educationalContent} />
            </div>
        </div>
        <footer className="w-full text-center p-6 text-[--text-tertiary] text-sm border-t border-[--border]">
          <p>Powered by Code Waves. This tool provides an analysis and is not a definitive judgment.</p>
        </footer>
      </div>
      <HistoryDrawer 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={userHistory}
        onLoadHistory={handleLoadHistory}
        onClearHistory={handleClearHistory}
        onDeleteItem={handleDeleteHistoryItem}
      />
      <WelcomeModal isOpen={showWelcome} onClose={handleCloseWelcome} />
      <TransparencyModal
        isOpen={isTransparencyOpen}
        onClose={() => setIsTransparencyOpen(false)}
        report={result?.transparencyReport}
      />
      <InfoDrawer isOpen={isInfoDrawerOpen} onClose={() => setIsInfoDrawerOpen(false)} />
       <GeneralChat 
        isOpen={isGeneralChatOpen}
        onClose={() => setIsGeneralChatOpen(false)}
        history={generalChatHistory}
        onSendMessage={handleSendGeneralMessage}
        isLoading={isGeneralChatLoading}
      />
      <button
        onClick={handleToggleGeneralChat}
        className="fixed bottom-6 right-6 z-30 w-16 h-16 bg-[--primary] text-[--primary-foreground] rounded-full shadow-lg hover:bg-[--primary-hover] transition-transform transform hover:scale-110 flex items-center justify-center"
        aria-label="Open Trust AI Assistant"
      >
        <ChatBubbleOvalLeftEllipsisIcon className="w-8 h-8" />
      </button>
    </>
  );
};

export default App;