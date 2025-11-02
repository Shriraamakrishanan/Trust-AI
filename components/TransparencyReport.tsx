
import React from 'react';
import { TransparencyReportData } from '../types';
import InformationCircleIcon from './icons/InformationCircleIcon';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';

interface TransparencyReportProps {
  report: TransparencyReportData;
}

const ReportSection: React.FC<{ title: string; items: string[]; icon: React.ReactNode }> = ({ title, items, icon }) => (
    <div>
        <h4 className="text-lg font-semibold text-[--text-primary] mb-3 flex items-center space-x-2">
            {icon}
            <span>{title}</span>
        </h4>
        <ul className="space-y-2 pl-2">
            {items.map((item, index) => (
                <li key={index} className="flex items-start space-x-3 text-[--text-secondary]">
                    <span className="mt-1.5 w-1.5 h-1.5 bg-current rounded-full flex-shrink-0"></span>
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    </div>
);

const TransparencyReport: React.FC<TransparencyReportProps> = ({ report }) => {
  return (
    <div className="space-y-6 bg-[--background] p-4 rounded-lg">
        <ReportSection 
            title="How This Was Analyzed" 
            items={report.process}
            icon={<InformationCircleIcon className="w-6 h-6 text-[--primary]" />}
        />
        <ReportSection 
            title="Limitations to Consider"
            items={report.limitations}
            icon={<ExclamationTriangleIcon className="w-6 h-6 text-[--warning]" />}
        />
        <div>
            <h4 className="text-lg font-semibold text-[--text-primary] mb-2">A Note on Critical Thinking</h4>
            <p className="text-[--text-secondary] italic bg-[--surface-muted] border-l-4 border-[--border] p-3 rounded">"{report.disclaimer}"</p>
        </div>
    </div>
  );
};

export default TransparencyReport;
