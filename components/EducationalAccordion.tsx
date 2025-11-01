
import React, { useState } from 'react';
import { EducationalItem } from '../types';
import ChevronDownIcon from './icons/ChevronDownIcon';

interface EducationalAccordionProps {
  items: EducationalItem[];
}

const AccordionItem: React.FC<{ item: EducationalItem }> = ({ item }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-[--border]">
      <h3>
        <button
          type="button"
          className="flex justify-between items-center w-full p-5 font-medium text-left text-[--text-primary] hover:bg-[--surface-muted] transition-colors duration-200"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
        >
          <span className="text-lg">{item.title}</span>
          <ChevronDownIcon className={`w-5 h-5 text-[--text-secondary] transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </h3>
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'} grid`}>
        <div className="overflow-hidden">
            <div className="p-5 pt-0">
                <p className="text-[--text-secondary]">{item.content}</p>
            </div>
        </div>
      </div>
    </div>
  );
};


const EducationalAccordion: React.FC<EducationalAccordionProps> = ({ items }) => {
  return (
    <section className="bg-[--surface] rounded-xl shadow-lg border border-[--border] overflow-hidden">
      <header className="p-6 border-b border-[--border]">
        <h2 className="text-2xl font-bold text-center text-[--text-primary]">How to Spot Misinformation</h2>
      </header>
      <div>
        {items.map((item, index) => (
          <AccordionItem key={index} item={item} />
        ))}
      </div>
    </section>
  );
};

export default EducationalAccordion;