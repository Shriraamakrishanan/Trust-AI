import React from 'react';
import XMarkIcon from './icons/XMarkIcon';
import SparklesIcon from './icons/SparklesIcon';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg p-6 mx-4 bg-[--surface] rounded-2xl shadow-xl border border-[--border]">
        <div className="flex flex-col items-center text-center">
            <div className="flex-shrink-0 flex items-center justify-center h-16 w-16 rounded-full bg-[--primary-soft] mb-4">
                <SparklesIcon className="h-8 w-8 text-[--primary-soft-foreground]" />
            </div>

            <h3 className="text-2xl font-bold text-[--text-primary]" id="modal-title">
                Welcome to Trust AI
            </h3>

            <div className="mt-2">
                <p className="text-base text-[--text-secondary]">
                    Your AI-powered research assistant for analyzing content. Check text, URLs, images, and documents for signs of misinformation and get detailed, fact-checked insights.
                </p>
            </div>

            <div className="mt-6 w-full">
                <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-3 bg-[--primary] text-base font-bold text-[--primary-foreground] hover:bg-[--primary-hover] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--ring] transition-colors"
                    onClick={onClose}
                >
                    Get Started
                </button>
            </div>
        </div>
        
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 text-[--text-secondary] hover:bg-[--surface-muted] rounded-full transition-colors"
          aria-label="Close"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default WelcomeModal;
