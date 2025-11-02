import React, { useState, useEffect, useRef } from 'react';
import { AnalysisResult } from '../types';
import LinkIcon from './icons/LinkIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import PhotoIcon from './icons/PhotoIcon';
import DocumentArrowUpIcon from './icons/DocumentArrowUpIcon';
import XMarkIcon from './icons/XMarkIcon';
import DeepDive from './DeepDive'; 
import MicrophoneIcon from './icons/MicrophoneIcon';

interface AnalysisCardProps {
  onAnalyze: (content: string, type: 'text' | 'url' | 'image' | 'document', files?: File | File[]) => void;
  isLoading: boolean;
  result: AnalysisResult | null;
  error: string | null;
}

const LoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center space-y-4 p-8">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[--primary]"></div>
    <p className="text-[--text-secondary] text-lg mt-4">Your secured research assistant is analyzing...</p>
  </div>
);

const AnalysisCard: React.FC<AnalysisCardProps> = ({ onAnalyze, isLoading, result, error }) => {
  const [analysisType, setAnalysisType] = useState<'text' | 'url' | 'image' | 'document'>('text');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState<'image' | 'document' | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isSpeechRecognitionSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const MAX_DOCS = 10;

  useEffect(() => {
    if (!isSpeechRecognitionSupported) {
      console.warn("Speech recognition not supported by this browser.");
      return;
    }

    // FIX: Cast window to `any` to access non-standard SpeechRecognition APIs
    // without TypeScript errors.
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      if (analysisType === 'text') {
        setText(prevText => (prevText ? prevText.trim() + ' ' : '') + transcript);
      } else if (analysisType === 'image') {
        setImagePrompt(prevPrompt => (prevPrompt ? prevPrompt.trim() + ' ' : '') + transcript);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isSpeechRecognitionSupported, analysisType]);

  const handleListen = () => {
      if (isLoading || !recognitionRef.current) {
          return;
      }
      
      if (isListening) {
          recognitionRef.current.stop();
      } else {
          try {
              recognitionRef.current.start();
          } catch(e) {
              console.error("Error starting speech recognition:", e);
              setIsListening(false);
          }
      }
  };

  const handleTabSwitch = (type: 'text' | 'url' | 'image' | 'document') => {
    if (analysisType !== type) {
      setAnalysisType(type);
      // Clear all input fields for a clean slate
      setText('');
      setUrl('');
      setImagePrompt('');
      setImageFile(null);
      setImagePreview(null);
      setDocFiles([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (analysisType === 'text') {
      onAnalyze(text, 'text');
    } else if (analysisType === 'url') {
      onAnalyze(url, 'url');
    } else if (analysisType === 'image' && imageFile) {
      onAnalyze(imagePrompt, 'image', imageFile);
    } else if (analysisType === 'document' && docFiles.length > 0) {
      onAnalyze('', 'document', docFiles);
    }
  };
  
  const handleFileChange = (files: FileList | null, type: 'image' | 'document') => {
      if (!files) return;
      if (type === 'image' && files[0]) {
          const file = files[0];
          setImageFile(file);
          const reader = new FileReader();
          reader.onloadend = () => {
              setImagePreview(reader.result as string);
          };
          reader.readAsDataURL(file);
      } else if (type === 'document') {
          const newFiles = Array.from(files);
          setDocFiles(prevFiles => {
              const combined = [...prevFiles, ...newFiles];
              if (combined.length > MAX_DOCS) {
                  alert(`You can only upload a maximum of ${MAX_DOCS} documents.`);
                  return combined.slice(0, MAX_DOCS);
              }
              return combined;
          });
      }
  };

  const handleDragEvent = (e: React.DragEvent<HTMLLabelElement>, action: 'enter' | 'leave' | 'drop', type: 'image' | 'document') => {
      e.preventDefault();
      e.stopPropagation();
      if (action === 'enter') {
          setIsDragging(type);
      } else if (action === 'leave' || action === 'drop') {
          setIsDragging(null);
      }
      if (action === 'drop') {
          handleFileChange(e.dataTransfer.files, type);
      }
  };

  const handleRemoveDocFile = (indexToRemove: number) => {
    setDocFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
  };
  
  const isButtonDisabled = isLoading || isListening ||
    (analysisType === 'text' && !text.trim()) || 
    (analysisType === 'url' && !url.trim()) ||
    (analysisType === 'image' && (!imageFile || !imagePrompt.trim())) ||
    (analysisType === 'document' && docFiles.length === 0);

  const TabButton: React.FC<{
    type: 'text' | 'url' | 'image' | 'document';
    label: string;
    icon: React.ReactNode;
  }> = ({ type, label, icon }) => (
    <button
      type="button"
      onClick={() => handleTabSwitch(type)}
      className={`relative flex-1 flex items-center justify-center space-x-2 p-4 font-semibold transition-colors duration-200 border-b-2 ${
        analysisType === type
          ? 'text-[--primary] border-[--primary]'
          : 'text-[--text-secondary] border-transparent hover:bg-[--surface-muted] hover:text-[--text-primary]'
      }`}
      aria-pressed={analysisType === type}
      role="tab"
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="bg-[--surface] rounded-xl shadow-lg border border-[--border]">
      <div className="flex border-b border-[--border]">
        <TabButton type="text" label="Text" icon={<DocumentTextIcon className="w-5 h-5" />} />
        <TabButton type="url" label="URL" icon={<LinkIcon className="w-5 h-5" />} />
        <TabButton type="image" label="Image" icon={<PhotoIcon className="w-5 h-5" />} />
        <TabButton type="document" label="Deep Dive" icon={<DocumentArrowUpIcon className="w-5 h-5" />} />
      </div>

      <div className="p-6 md:p-8">
        <form onSubmit={handleSubmit}>
          {analysisType === 'text' && (
            <div className="relative w-full">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste text, or use the mic to dictate..."
                className="w-full h-40 p-4 pr-12 bg-[--surface-muted] border border-[--border] rounded-md focus:ring-2 focus:ring-[--ring] focus:outline-none transition duration-200 resize-none placeholder:text-[--text-tertiary]"
                disabled={isLoading}
                aria-label="Text to analyze"
              />
              {isSpeechRecognitionSupported && (
                  <button
                      type="button"
                      onClick={handleListen}
                      disabled={isLoading}
                      className={`absolute right-3 bottom-3 p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--ring] ${
                          isListening
                          ? 'bg-[--danger-soft] text-[--danger] scale-110'
                          : 'bg-transparent text-[--text-secondary] hover:bg-[--surface-muted]'
                      }`}
                      aria-label={isListening ? 'Stop dictation' : 'Start dictation'}
                  >
                      <MicrophoneIcon className="w-5 h-5" />
                  </button>
              )}
            </div>
          )}
          {analysisType === 'url' && (
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/news-article"
              className="w-full p-4 bg-[--surface-muted] border border-[--border] rounded-md focus:ring-2 focus:ring-[--ring] focus:outline-none transition duration-200 placeholder:text-[--text-tertiary]"
              disabled={isLoading}
              aria-label="URL to analyze"
            />
          )}
          {analysisType === 'image' && (
             <div className="space-y-4">
              <label 
                htmlFor="image-upload" 
                onDragEnter={(e) => handleDragEvent(e, 'enter', 'image')}
                onDragLeave={(e) => handleDragEvent(e, 'leave', 'image')}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDragEvent(e, 'drop', 'image')}
                className={`relative block w-full p-6 text-center border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging === 'image' ? 'border-[--primary] bg-[--primary-soft]' : 'border-[--border] hover:border-[--primary]'}`}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Selected preview" className="max-h-48 mx-auto rounded-md" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-[--text-secondary]">
                    <PhotoIcon className="w-12 h-12 mx-auto text-[--text-tertiary]" />
                    <span className="mt-2 text-sm font-semibold">Click to upload or drag & drop</span>
                    <span className="text-xs">PNG, JPG, GIF up to 10MB</span>
                  </div>
                )}
                <input id="image-upload" type="file" className="sr-only" accept="image/*" onChange={(e) => handleFileChange(e.target.files, 'image')} disabled={isLoading} />
              </label>
              <div className="relative w-full">
                <input
                    type="text"
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    placeholder="Ask a question, or use the mic..."
                    className="w-full p-4 pr-12 bg-[--surface-muted] border border-[--border] rounded-md focus:ring-2 focus:ring-[--ring] focus:outline-none transition duration-200 placeholder:text-[--text-tertiary]"
                    disabled={isLoading || !imageFile}
                    aria-label="Question about the image"
                />
                {isSpeechRecognitionSupported && (
                    <button
                        type="button"
                        onClick={handleListen}
                        disabled={isLoading || !imageFile}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[--ring] disabled:opacity-50 disabled:cursor-not-allowed ${
                            isListening
                            ? 'bg-[--danger-soft] text-[--danger] scale-110'
                            : 'bg-transparent text-[--text-secondary] hover:bg-[--surface-muted]'
                        }`}
                        aria-label={isListening ? 'Stop dictation' : 'Start dictation'}
                    >
                        <MicrophoneIcon className="w-5 h-5" />
                    </button>
                )}
              </div>
            </div>
          )}
           {analysisType === 'document' && (
             <div className="space-y-4">
                {docFiles.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-[--text-primary]">Selected Files ({docFiles.length}/{MAX_DOCS}):</p>
                        <ul className="max-h-40 overflow-y-auto space-y-2 rounded-md border border-[--border] bg-[--surface-muted] p-2">
                            {docFiles.map((file, index) => (
                                <li key={index} className="flex items-center justify-between text-sm p-2 bg-[--surface] rounded">
                                    <span className="truncate text-[--text-secondary]" title={file.name}>{file.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveDocFile(index)}
                                        className="p-1 text-[--text-tertiary] hover:text-[--danger] rounded-full hover:bg-[--border]"
                                        aria-label={`Remove ${file.name}`}
                                        disabled={isLoading}
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
              <label 
                htmlFor="doc-upload"
                onDragEnter={(e) => handleDragEvent(e, 'enter', 'document')}
                onDragLeave={(e) => handleDragEvent(e, 'leave', 'document')}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDragEvent(e, 'drop', 'document')}
                className={`relative block w-full p-6 text-center border-2 border-dashed rounded-lg transition-colors ${docFiles.length >= MAX_DOCS ? 'cursor-not-allowed bg-[--surface-muted] opacity-60' : `cursor-pointer ${isDragging === 'document' ? 'border-[--primary] bg-[--primary-soft]' : 'border-[--border] hover:border-[--primary]'}`}`}
              >
                <div className="flex flex-col items-center justify-center text-[--text-secondary]">
                  <DocumentArrowUpIcon className="w-12 h-12 mx-auto text-[--text-tertiary]" />
                  <span className="mt-2 text-sm font-semibold">Click to upload or drag & drop</span>
                  <span className="text-xs">Supports PDF, Excel, and text files. Max {MAX_DOCS} files.</span>
                </div>
                <input 
                  id="doc-upload" 
                  type="file" 
                  multiple 
                  className="sr-only" 
                  onChange={(e) => handleFileChange(e.target.files, 'document')} 
                  disabled={isLoading || docFiles.length >= MAX_DOCS} 
                  accept=".txt,.md,.csv,.json,.pdf,.xlsx,.xls,text/plain,text/markdown,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                />
              </label>
              <p className="text-sm text-[--text-secondary] text-center">Get an in-depth analysis of your documents, then ask follow-up questions to learn more.</p>
            </div>
          )}
          <button
            type="submit"
            disabled={isButtonDisabled}
            className="mt-6 w-full bg-[--primary] text-[--primary-foreground] font-bold py-3 px-4 rounded-md hover:bg-[--primary-hover] disabled:bg-[--text-tertiary] disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center text-base"
          >
            {isLoading ? 'Analyzing...' : `Analyze ${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}`}
          </button>
        </form>
        
        { (isLoading || error || result) && (
            <div className="mt-8 pt-8 border-t border-[--border]">
                {isLoading && <LoadingSpinner />}
                {error && <div className="text-[--danger] bg-[--danger-soft] p-4 rounded-md text-center">{error}</div>}
                {result && <DeepDive result={result} />}
            </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisCard;