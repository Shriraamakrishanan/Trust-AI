

import React from 'react';
import { AnalysisResult, RiskLevel } from '../types';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';
import InformationCircleIcon from './icons/InformationCircleIcon';
import SparklesIcon from './icons/SparklesIcon';
import AnalysisTabs from './AnalysisTabs';
import CredibilityScore from './CredibilityScore';
import ContentMetrics from './ContentMetrics';

interface DeepDiveProps {
  result: AnalysisResult;
}

const RiskIndicator: React.FC<{ level: RiskLevel }> = ({ level }) => {
  const config = {
    [RiskLevel.HIGH]: {
      text: "High Risk of Misinformation",
      icon: <ExclamationTriangleIcon className="w-7 h-7 text-[--danger]" />,
      textColor: "text-[--danger]",
      bg: "bg-[--danger-soft]",
    },
    [RiskLevel.MEDIUM]: {
      text: "Medium Risk / Caution Advised",
      icon: <ExclamationTriangleIcon className="w-7 h-7 text-[--warning]" />,
      textColor: "text-[--warning]",
      bg: "bg-[--warning-soft]",
    },
    [RiskLevel.LOW]: {
      text: "Low Risk of Misinformation",
      icon: <CheckCircleIcon className="w-7 h-7 text-[--success]" />,
      textColor: "text-[--success]",
      bg: "bg-[--success-soft]",
    },
    [RiskLevel.UNKNOWN]: {
      text: "Analysis Result",
      icon: <InformationCircleIcon className="w-7 h-7 text-[--primary-soft-foreground]" />,
      textColor: "text-[--primary-soft-foreground]",
      bg: "bg-[--primary-soft]",
    }
  };

  const current = config[level] || config[RiskLevel.UNKNOWN];

  return (
    <div className={`p-4 rounded-lg flex flex-col items-center justify-center text-center space-y-2 h-full ${current.bg} border border-[--border]`}>
      <div className="flex-shrink-0">{current.icon}</div>
      <h2 className={`text-xl font-bold ${current.textColor}`}>{current.text}</h2>
      <p className="text-sm text-[--text-secondary]">Based on available information and our analysis.</p>
    </div>
  );
};

const CachedResultIndicator: React.FC = () => (
    <div className="p-3 mb-4 rounded-lg flex items-center space-x-3 bg-[--surface-muted] border border-[--border]">
        <InformationCircleIcon className="w-5 h-5 text-[--text-secondary] flex-shrink-0" />
        <p className="text-sm text-[--text-secondary]">
            This result was loaded from the cache for faster access.
        </p>
    </div>
);

const DeepDive: React.FC<DeepDiveProps> = ({ result }) => {
    const hasMetrics = result.credibilityScore !== undefined || result.riskLevel;
    const hasNlpMetrics = result.language || result.sentiment;

    return (
        <div className="space-y-8 animate-fade-in">
            {result.isFromCache && <CachedResultIndicator />}
            
            {hasMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {result.credibilityScore !== undefined && (
                        <CredibilityScore score={result.credibilityScore} />
                    )}
                    <div className={result.credibilityScore === undefined ? 'md:col-span-2' : ''}>
                        <RiskIndicator level={result.riskLevel} />
                    </div>
                </div>
            )}

            {hasNlpMetrics && (
                <ContentMetrics language={result.language} sentiment={result.sentiment} />
            )}

            <AnalysisTabs result={result} />

            {result.nextSuggestions && result.nextSuggestions.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-[--text-primary] mb-3">Suggested Next Steps</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                        {result.nextSuggestions.slice(0, 2).map((suggestion, index) => {
                            const suggestionContent = typeof suggestion === 'string'
                                ? suggestion
                                : (suggestion && typeof suggestion === 'object' && 'suggestion' in suggestion ? String(suggestion.suggestion) : JSON.stringify(suggestion));

                            return (
                                <div key={index} className="p-4 bg-[--surface-muted] rounded-lg text-sm text-[--text-secondary] flex items-start space-x-3 border border-[--border]">
                                    <SparklesIcon className="w-5 h-5 mt-0.5 flex-shrink-0 text-[--primary]" />
                                    <span>{suggestionContent}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {result.sources?.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-[--text-primary] mb-3">Web Sources Used for Analysis</h3>
                    <ul className="space-y-2">
                        {result.sources.map((source, index) => (
                            <li key={index} className="flex items-start space-x-2">
                                <svg className="w-4 h-4 text-[--primary] mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-[--primary] hover:underline break-all">
                                    {source.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default DeepDive;
