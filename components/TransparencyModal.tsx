
import React from 'react';
import { TransparencyReportData } from '../types';
import TransparencyReport from './TransparencyReport';
import XMarkIcon from './icons/XMarkIcon';
import EyeIcon from './icons/EyeIcon';

interface TransparencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: TransparencyReportData | undefined;
}

const TransparencyModal: React.FC<TransparencyModalProps> = ({ isOpen, onClose, report }) => {
  if (!isOpen || !report) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl p-6 mx-4 bg-[--surface] rounded-2xl shadow-xl border border-[--border]">
        <div className="flex flex-col">
            <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-[--primary-soft]">
                    <EyeIcon className="h-6 w-6 text-[--primary-soft-foreground]" />
                </div>
                <h3 className="text-2xl font-bold text-[--text-primary]" id="modal-title">
                    Transparency Report
                </h3>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto pr-2">
                <TransparencyReport report={report} />
            </div>

            <div className="mt-6 text-right">
                <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[--primary] text-base font-medium text-[--primary-foreground] hover:bg-[--primary-hover] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--ring] transition-colors"
                    onClick={onClose}
                >
                    Close
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

export default TransparencyModal;
