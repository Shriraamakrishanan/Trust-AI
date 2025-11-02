import React from 'react';
import XMarkIcon from './icons/XMarkIcon';
import InformationCircleIcon from './icons/InformationCircleIcon';
import SparklesIcon from './icons/SparklesIcon';

interface InfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const InfoSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-6">
        <h3 className="text-lg font-semibold text-[--text-primary] mb-2 flex items-center">
            <SparklesIcon className="w-5 h-5 text-[--primary] mr-2" />
            {title}
        </h3>
        <div className="space-y-2 text-[--text-secondary] pl-7">{children}</div>
    </div>
);

const InfoDrawer: React.FC<InfoDrawerProps> = ({ isOpen, onClose }) => {
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
        aria-labelledby="info-title"
      >
        <div className="flex flex-col h-full">
          <header className="flex items-center justify-between p-4 border-b border-[--border] flex-shrink-0">
            <h2 id="info-title" className="text-xl font-bold text-[--text-primary] flex items-center">
                <InformationCircleIcon className="w-6 h-6 mr-3 text-[--text-secondary]" />
                About Trust AI
            </h2>
            <button onClick={onClose} className="p-2 text-[--text-secondary] hover:bg-[--surface-muted] rounded-full" aria-label="Close panel">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </header>

          <div className="flex-grow overflow-y-auto p-6">
            <InfoSection title="Our Mission">
                <p>Trust AI is an AI-powered research assistant designed to help you analyze content for potential misinformation. Our goal is to provide tools that promote media literacy and critical thinking in the digital age.</p>
            </InfoSection>

            <InfoSection title="How It Works">
                <p>Using Trust AI's model, the tool performs a multi-faceted analysis:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li><strong>Content Analysis:</strong> It examines text for emotional language, unsubstantiated claims, and other common markers of misinformation.</li>
                    <li><strong>Web Grounding:</strong> For URLs and key claims, it uses Google Search to find corroborating evidence or conflicting reports from reputable sources.</li>
                    <li><strong>Deep Dive:</strong> For documents and images, it extracts metadata, analyzes visual context, and identifies key entities to provide a comprehensive overview.</li>
                </ul>
            </InfoSection>
            
            <InfoSection title="Key Features">
                <ul className="list-disc list-inside space-y-1">
                    <li>Analyze text, URLs, images, and documents.</li>
                    <li>Receive a risk assessment and credibility score.</li>
                    <li>Engage with a follow-up assistant to ask questions.</li>
                    <li>View a transparency report on the AI's process.</li>
                </ul>
            </InfoSection>

            <InfoSection title="Ethical Use & Disclaimer">
                 <p className="font-semibold text-[--text-primary]">This is a tool to aid, not replace, human judgment.</p>
                 <p>AI analysis provides insights, not definitive truth. Always verify critical information from multiple, independent sources before making decisions.</p>
            </InfoSection>
            
            <InfoSection title="Privacy">
                 <p>Your analysis history is stored locally in your browser and is not sent to our servers. Clearing your browser's local storage will permanently remove your history.</p>
            </InfoSection>

          </div>
        </div>
      </div>
    </>
  );
};

export default InfoDrawer;