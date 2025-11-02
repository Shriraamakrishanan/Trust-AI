

import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { AnalysisResult, RiskLevel, GroundingSource, GraphData, TransparencyReportData } from '../types';

// Let's declare the global libraries that are loaded via script tags in index.html
declare const pdfjsLib: any;
declare const XLSX: any;

const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("API_KEY or GEMINI_API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey });

// --- START CACHE LOGIC ---
const CACHE_DATA_KEY = 'trust_ai_cache_data';
const CACHE_LRU_KEY = 'trust_ai_cache_lru';
const MAX_CACHE_SIZE = 10; // Store the last 10 unique analyses

interface CacheData {
  [key: string]: Omit<AnalysisResult, 'isFromCache'>;
}

const bufferToHex = (buffer: ArrayBuffer): string => {
  return [...new Uint8Array(buffer)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

const fileToHash = async (file: File): Promise<string> => {
    const fileBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    return bufferToHex(hashBuffer);
};

const createCacheKey = async (type: 'text' | 'url' | 'image' | 'document', textContent: string, files?: File | File[]): Promise<string> => {
    const encoder = new TextEncoder();
    let combinedData = `${type}::${textContent}`;

    if (files) {
        const fileArr = Array.isArray(files) ? files : [files];
        const fileHashes = await Promise.all(fileArr.map(fileToHash));
        combinedData += `::${fileHashes.join('')}`;
    }

    const dataBuffer = encoder.encode(combinedData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return bufferToHex(hashBuffer);
};


const getFromCache = (key: string): Omit<AnalysisResult, 'isFromCache'> | null => {
  try {
    const dataStr = localStorage.getItem(CACHE_DATA_KEY);
    if (!dataStr) return null;
    const data: CacheData = JSON.parse(dataStr);
    
    if (data[key]) {
        const lruStr = localStorage.getItem(CACHE_LRU_KEY);
        const lru: string[] = lruStr ? JSON.parse(lruStr) : [];
        const newLru = [key, ...lru.filter(k => k !== key)];
        localStorage.setItem(CACHE_LRU_KEY, JSON.stringify(newLru.slice(0, MAX_CACHE_SIZE)));
        return data[key];
    }
    return null;
  } catch (error) {
    console.error("Error reading from cache:", error);
    return null;
  }
};

const saveToCache = (key: string, result: Omit<AnalysisResult, 'isFromCache'>) => {
    try {
        const dataStr = localStorage.getItem(CACHE_DATA_KEY);
        const data: CacheData = dataStr ? JSON.parse(dataStr) : {};
        
        const lruStr = localStorage.getItem(CACHE_LRU_KEY);
        let lru: string[] = lruStr ? JSON.parse(lruStr) : [];

        if (Object.keys(data).length >= MAX_CACHE_SIZE && !data[key]) {
            const keyToRemove = lru.pop();
            if (keyToRemove) {
                delete data[keyToRemove];
            }
        }
        
        data[key] = result;
        lru = [key, ...lru.filter(k => k !== key)].slice(0, MAX_CACHE_SIZE);
        
        localStorage.setItem(CACHE_DATA_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_LRU_KEY, JSON.stringify(lru));

    } catch (error) {
        console.error("Error saving to cache:", error);
    }
};
// --- END CACHE LOGIC ---


const fileToGenerativePart = async (file: File) => {
  const base64EncodedData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
};

const parseDocument = async (file: File): Promise<string> => {
  if (file.type === 'application/pdf') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;
      const doc = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
      let text = '';
      for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: any) => item.str).join(' ');
      }
      return text;
  } else if (file.type.startsWith('text/')) {
      return file.text();
  } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_csv(worksheet);
  }
  throw new Error(`Unsupported document type: ${file.type}`);
};

const analysisResponseSchema = {
    type: Type.OBJECT,
    properties: {
        riskLevel: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN'] },
        summary: { type: Type.STRING },
        insights: { type: Type.ARRAY, items: { type: Type.STRING } },
        credibilityScore: { type: Type.NUMBER },
        keyHighlights: { type: Type.ARRAY, items: { type: Type.STRING } },
        nextSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
        tone: { type: Type.STRING },
        language: { type: Type.STRING },
        sentiment: { type: Type.STRING },
        graphData: {
            type: Type.OBJECT,
            properties: {
                nodes: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            label: { type: Type.STRING },
                            type: { type: Type.STRING }
                        },
                        required: ['id', 'label', 'type']
                    }
                },
                edges: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            source: { type: Type.STRING },
                            target: { type: Type.STRING },
                            label: { type: Type.STRING }
                        },
                        required: ['source', 'target', 'label']
                    }
                }
            }
        },
        imageDescriptions: { type: Type.ARRAY, items: { type: Type.STRING } },
        metadata: { type: Type.STRING },
    },
    required: ['riskLevel', 'summary', 'insights']
};

export const analyzeContent = async (
  content: string,
  type: 'text' | 'url' | 'image' | 'document',
  files?: File | File[]
): Promise<AnalysisResult> => {
  const cacheKey = await createCacheKey(type, content, files);
  const cachedResult = getFromCache(cacheKey);
  if (cachedResult) {
      return { ...cachedResult, isFromCache: true };
  }

  let prompt = '';
  let parts: any[] = [];
  let sourceFileName = '';
  
  const filesArray = files ? (Array.isArray(files) ? files : [files]) : [];
  sourceFileName = filesArray.length > 0 ? filesArray.map(f => f.name).join(', ') : '';

  switch (type) {
    case 'text':
      prompt = `Analyze the following text for misinformation: "${content}"`;
      parts.push({ text: prompt });
      break;
    case 'url':
      prompt = `Analyze the content of the URL for misinformation: ${content}`;
      parts.push({ text: prompt });
      break;
    case 'image':
      prompt = `Analyze this image for misinformation, considering the user's question: "${content}"`;
      parts.push({ text: prompt });
      if (filesArray[0]) {
        parts.push(await fileToGenerativePart(filesArray[0]));
      }
      break;
    case 'document':
      const docContents = await Promise.all(filesArray.map(parseDocument));
      const combinedDocContent = docContents.join('\n\n---\n\n');
      prompt = `Analyze the following document(s) for misinformation. The content is: \n\n${combinedDocContent}`;
      parts.push({ text: prompt });
      break;
  }
  
  const systemInstruction = `You are an expert misinformation analyst. Analyze the provided content and return a detailed report.
- riskLevel: Assess the risk of misinformation (LOW, MEDIUM, HIGH, UNKNOWN).
- summary: Provide a concise summary of your findings.
- insights: List key observations, red flags, or noteworthy points. Sometimes an insight can be an object with a "suggestion" and a "detail" property.
- credibilityScore: An estimated score from 0-100 based on factors like sourcing, language, and evidence.
- keyHighlights: Bullet points of the most critical findings.
- nextSuggestions: Two actionable suggestions for the user to investigate further.
- tone: The overall tone of the content.
- language: The detected language of the content.
- sentiment: The sentiment of the content (Positive, Negative, Neutral). For images, it's the sentiment of the user query.
- graphData: For documents, identify key entities (people, organizations, locations, topics) and their relationships.
- imageDescriptions: For documents containing images, describe each image.
- metadata: For documents, extract available metadata (author, creation date, etc.). Format this as a JSON string. For example: '{"author": "Jane Doe", "created": "2024-01-01"}'. If no metadata is found, return an empty JSON object as a string: '{}'.
- The analysis should be grounded in verifiable facts.
- IMPORTANT: You MUST format your entire response as a single, valid JSON object. Do not use markdown backticks like \`\`\`json or any other text outside the JSON.`;
  
  try {
    const useGoogleSearch = type === 'text' || type === 'url';

    const config: any = {
      systemInstruction,
    };

    if (useGoogleSearch) {
      config.tools = [{ googleSearch: {} }];
    } else {
      config.responseMimeType = 'application/json';
      config.responseSchema = analysisResponseSchema;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: { parts: parts },
      config: config
    });
    
    let responseText = response.text.trim();
    // Use a regex to strip markdown fences if they exist
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      responseText = jsonMatch[1];
    }
    
    const parsedJson = JSON.parse(responseText);
    
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const sources: GroundingSource[] = groundingMetadata?.groundingChunks
        ?.map((chunk: any) => chunk.web)
        .filter(Boolean)
        .map((web: any) => ({ uri: web.uri, title: web.title })) || [];

    const transparencyReport: TransparencyReportData = {
        process: [
            `The analysis was initiated for a '${type}' input.`,
            `The content was processed by a large language model with specific instructions to act as a misinformation expert.`,
            type === 'url' || type === 'text' ? 'Google Search was used to ground the analysis with real-time web information.' : 'The analysis was based on the provided content itself.',
            'The model evaluated various factors including language, sourcing (if applicable), potential biases, and consistency of information.',
            'A structured JSON response containing risk level, summary, insights, and other metrics was generated.'
        ],
        limitations: [
            'The AI is a tool and may not understand all nuances, sarcasm, or cultural context.',
            'Real-time information can be volatile; web search results reflect a snapshot in time.',
            'The credibility score is an estimation and not a definitive measure of truth.',
            'Analysis of complex documents or images may miss subtle details.'
        ],
        disclaimer: "This tool is designed to assist in critical thinking, not to replace it. Always verify information from multiple reputable sources before forming a conclusion."
    };

    // Safely construct the result, ensuring arrays are always arrays
    const result: AnalysisResult = {
        riskLevel: parsedJson.riskLevel || RiskLevel.UNKNOWN,
        summary: parsedJson.summary || '',
        insights: parsedJson.insights || [],
        sources,
        graphData: parsedJson.graphData,
        originalContent: content,
        originalType: type,
        credibilityScore: parsedJson.credibilityScore,
        keyHighlights: parsedJson.keyHighlights || [],
        metadata: parsedJson.metadata,
        imageDescriptions: parsedJson.imageDescriptions || [],
        nextSuggestions: parsedJson.nextSuggestions || [],
        tone: parsedJson.tone,
        isFromCache: false,
        sourceFileName,
        transparencyReport,
        language: parsedJson.language,
        sentiment: parsedJson.sentiment,
    };

    if (result.metadata && typeof result.metadata === 'string') {
        try {
            result.metadata = JSON.parse(result.metadata);
        } catch (e) {
            console.error("Could not parse metadata string:", result.metadata, e);
            result.metadata = { raw_metadata: result.metadata };
        }
    }
    
    saveToCache(cacheKey, result);
    return result;

  } catch (err: any) {
      console.error("Gemini API Error:", err);
      let errorMessage = err.message;
      try {
        // Try to parse a JSON error message from the response
        const errorJson = JSON.parse(err.message);
        errorMessage = errorJson?.error?.message || err.message;
      } catch (e) {
        // Not a JSON error, use original message
      }
      throw new Error(`Failed to analyze content. Gemini API returned an error: ${errorMessage}`);
  }
};

export const startChat = (analysisResult: AnalysisResult): Chat => {
  const history = [
      {
          role: 'user',
          parts: [{ text: `Here is the content I analyzed: Type: ${analysisResult.originalType}, Content: ${analysisResult.originalContent}` }]
      },
      {
          role: 'model',
          parts: [{ text: `Understood. I have the context of the analysis. Here is a summary of the findings: ${analysisResult.summary}. You can now ask me follow-up questions.` }]
      }
  ];

  const model = ai.chats.create({
    model: 'gemini-2.5-flash',
    history: history,
    config: {
      systemInstruction: 'You are a helpful follow-up assistant. The user has just received an analysis of a piece of content. Your role is to answer their questions about the analysis, help them dig deeper into the topics, and provide further clarification. Be concise and stay on topic. When formatting your response, you MUST use HTML tags, not Markdown. Use <b> tags for bold text instead of asterisks (*) or hashes (#). Use <ol> with <li> tags for numbered lists instead of markdown numbers (e.g., 1.).',
    },
  });
  return model;
};

export const startGeneralChat = (): Chat => {
  const history = [
    {
      role: 'model' as const,
      parts: [{ text: "Hello! I'm the Trust AI assistant. How can I help you understand this application and its features today?" }]
    }
  ];

  const model = ai.chats.create({
    model: 'gemini-2.5-flash',
    history: history,
    config: {
      systemInstruction: `You are Trust AI, a personal assistant for the Trust AI application.
- Answer only the direct question asked.
- Keep your answers short and crisp.
- Use HTML <b> tags to highlight important text, not Markdown.
- Your knowledge is strictly limited to the Trust AI application's features, architecture, data handling, and AI models.
- For example, if asked about the history button, respond: "The <b>history button</b> is in the top-right corner of the header." If asked about the theme button, respond: "The <b>theme button</b> is located on the top right corner of the header, near the history and information buttons." If asked about the transparency button, respond: "The <b>transparency button</b> appears in the header after an analysis is complete."`,
    },
  });
  return model;
};

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Translate the following text to ${targetLanguage}: \n\n${text}`
        });
        return response.text;
    } catch(err: any) {
        console.error("Translation Error:", err);
        throw new Error("Sorry, I was unable to translate the text.");
    }
};