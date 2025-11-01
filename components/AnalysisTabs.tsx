
import React, { useState, useEffect } from 'react';
import { AnalysisResult } from '../types';
import EntityGraph from './EntityGraph';
import MetadataCard from './MetadataCard';
import ClipboardDocumentListIcon from './icons/ClipboardDocumentListIcon';
import TagIcon from './icons/TagIcon';
import CubeTransparentIcon from './icons/CubeTransparentIcon';
import PhotoIcon from './icons/PhotoIcon';
import SparklesIcon from './icons/SparklesIcon';

interface AnalysisTabsProps {
  result: AnalysisResult;
}

type TabName = 'summary' | 'metadata' | 'insights' | 'entities' | 'images';

const AnalysisTabs: React.FC<AnalysisTabsProps> = ({ result }) => {
  const [activeTab, setActiveTab] = useState<TabName>('summary');

  const tabs: { id: TabName; label: string; icon: React.ReactNode; condition: boolean }[] = [
    { id: 'summary', label: 'Summary', icon: <ClipboardDocumentListIcon className="w-5 h-5" />, condition: !!result.summary },
    { id: 'metadata', label: 'Metadata', icon: <TagIcon className="w-5 h-5" />, condition: !!result.metadata && Object.keys(result.metadata).length > 0 },
    { id: 'insights', label: 'Insights', icon: <SparklesIcon className="w-5 h-5" />, condition: !!result.insights && result.insights.length > 0 },
    { id: 'entities', label: 'Entities', icon: <CubeTransparentIcon className="w-5 h-5" />, condition: !!result.graphData && result.graphData.nodes.length > 0 },
    { id: 'images', label: 'Images', icon: <PhotoIcon className="w-5 h-5" />, condition: !!result.imageDescriptions && result.imageDescriptions.length > 0 },
  ];

  const availableTabs = tabs.filter(tab => tab.condition);
  
  // Effect to reset to summary tab if it's available and the current active tab is not
  useEffect(() => {
    const isCurrentTabAvailable = availableTabs.some(tab => tab.id === activeTab);
    const isSummaryAvailable = availableTabs.some(tab => tab.id === 'summary');
    if (!isCurrentTabAvailable && isSummaryAvailable) {
      setActiveTab('summary');
    } else if (!isCurrentTabAvailable && availableTabs.length > 0) {
        setActiveTab(availableTabs[0].id);
    }
  }, [result, activeTab, availableTabs]);

  const TabButton: React.FC<{ id: TabName; label: string; icon: React.ReactNode; }> = ({ id, label, icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-3 py-2 text-sm font-semibold rounded-full transition-colors ${
        activeTab === id
          ? 'bg-[--primary-soft] text-[--primary-soft-foreground]'
          : 'text-[--text-secondary] hover:bg-[--surface-muted] hover:text-[--text-primary]'
      }`}
      role="tab"
      aria-selected={activeTab === id}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'summary':
        return <p className="text-[--text-secondary] whitespace-pre-wrap leading-relaxed">{result.summary}</p>;
      case 'metadata':
        return result.metadata && <MetadataCard metadata={result.metadata} tone={result.tone} />;
      case 'insights':
        return (
          <ul className="space-y-3">
            {result.insights.map((detail, index) => 
                <li key={index} className="flex items-start space-x-3">
                    <SparklesIcon className="w-5 h-5 text-[--primary] flex-shrink-0 mt-1" />
                    <span className="text-[--text-secondary]">{detail}</span>
                </li>
            )}
          </ul>
        );
      case 'entities':
        return result.graphData && <EntityGraph graphData={result.graphData} />;
      case 'images':
        return (
            <ul className="space-y-3">
                {result.imageDescriptions?.map((desc, index) => 
                 <li key={index} className="flex items-start space-x-3">
                    <PhotoIcon className="w-5 h-5 text-[--primary] flex-shrink-0 mt-1" />
                    <span className="text-[--text-secondary]">{desc}</span>
                </li>
                )}
            </ul>
        );
      default:
        return null;
    }
  };

  // If no detailed content is available to tab through, just show the summary and insights.
  if (availableTabs.length < 2) {
      return (
          <div className="space-y-6">
              <div>
                  <h3 className="text-lg font-semibold text-[--text-primary] mb-2">Summary</h3>
                  <p className="text-[--text-secondary] leading-relaxed">{result.summary}</p>
              </div>
              {result.insights?.length > 0 && (
                  <div>
                      <h3 className="text-lg font-semibold text-[--text-primary] mb-2">Detailed Analysis</h3>
                      <ul className="space-y-3">
                        {result.insights.map((detail, index) => 
                            <li key={index} className="flex items-start space-x-3">
                                <SparklesIcon className="w-5 h-5 text-[--primary] flex-shrink-0 mt-1" />
                                <span className="text-[--text-secondary]">{detail}</span>
                            </li>
                        )}
                      </ul>
                  </div>
              )}
          </div>
      );
  }

  return (
    <div>
      <div className="border-b border-[--border] mb-4">
        <nav className="-mb-px flex space-x-2 overflow-x-auto pb-2" aria-label="Tabs" role="tablist">
          {availableTabs.map(tab => <TabButton key={tab.id} {...tab} />)}
        </nav>
      </div>
      <div className="p-1 min-h-[200px]" role="tabpanel">
        {renderContent()}
      </div>
    </div>
  );
};

export default AnalysisTabs;