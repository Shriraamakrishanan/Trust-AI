
import React from 'react';
import LanguageIcon from './icons/LanguageIcon';
import SentimentIcon from './icons/SentimentIcon';

interface ContentMetricsProps {
  language?: string;
  sentiment?: string;
}

const MetricDisplay: React.FC<{ icon: React.ReactNode; label: string; value?: string }> = ({ icon, label, value }) => {
  if (!value) return null;

  return (
    <div className="flex items-center space-x-3 bg-[--surface-muted] p-3 rounded-lg border border-[--border]">
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-[--primary-soft] rounded-full">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-[--text-secondary]">{label}</p>
        <p className="text-base font-bold text-[--text-primary]">{value}</p>
      </div>
    </div>
  );
};

const ContentMetrics: React.FC<ContentMetricsProps> = ({ language, sentiment }) => {
  if (!language && !sentiment) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <MetricDisplay
        icon={<LanguageIcon className="w-5 h-5 text-[--primary-soft-foreground]" />}
        label="Language"
        value={language}
      />
      <MetricDisplay
        icon={<SentimentIcon className="w-5 h-5 text-[--primary-soft-foreground]" />}
        label={sentiment?.includes("Query") ? "Query Sentiment" : "Content Sentiment"}
        value={sentiment}
      />
    </div>
  );
};

export default ContentMetrics;
