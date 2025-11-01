
import React from 'react';

interface MetadataCardProps {
  metadata: Record<string, any>;
  tone?: string;
}

const MetadataCard: React.FC<MetadataCardProps> = ({ metadata, tone }) => {
  const displayData = { ...metadata };
  if (tone) {
    displayData.tone = tone;
  }
  
  if (Object.keys(displayData).length === 0) {
    return <p className="text-[--text-secondary]">No metadata was extracted from the document.</p>;
  }

  return (
    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-base bg-[--background] p-4 rounded-lg">
      {Object.entries(displayData).map(([key, value]) => {
        // Skip empty or null values
        if (value === null || value === '' || (Array.isArray(value) && value.length === 0) || String(value).toLowerCase() === 'n/a') {
            return null;
        }

        return (
            <div key={key} className="flex flex-col">
                <dt className="font-semibold text-[--text-primary] capitalize">
                    {key.replace(/_/g, ' ')}
                </dt>
                <dd className="text-[--text-secondary]" title={String(value)}>
                    {Array.isArray(value) ? value.join(', ') : String(value)}
                </dd>
            </div>
        );
      })}
    </dl>
  );
};

export default MetadataCard;