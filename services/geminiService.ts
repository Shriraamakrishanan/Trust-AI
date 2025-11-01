import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";
import { AnalysisResult, RiskLevel, GroundingSource, GraphData } from '../types';

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

const createCacheKey = async (type: 'text' | 'url' | 'image' | 'document', textContent: string, files?: File | File[]): Promise<string> => {
    const encoder = new TextEncoder();
    const typeAndTextData = encoder.encode(`${type}::${textContent}`);

    if (type === 'text' || type === 'url') {
        const hashBuffer = await crypto.subtle.digest('SHA-256', typeAndTextData);
        return bufferToHex(hashBuffer);
    }
    
    const fileList = files ? (Array.isArray(files) ? files : [files]) : [];
    if (fileList.length === 0) {
        // Fallback for document type with no files, though validation should prevent this.
        const hashBuffer = await crypto.subtle.digest('SHA-256', typeAndTextData);
        return bufferToHex(hashBuffer);
    }

    const fileBuffers = await Promise.all(fileList.map(file => file.arrayBuffer()));
    const totalFileLength = fileBuffers.reduce((acc, buffer) => acc + buffer.byteLength, 0);
    
    const combined = new Uint8Array(typeAndTextData.length + totalFileLength);
    let offset = 0;
    combined.set(typeAndTextData, offset);
    offset += typeAndTextData.length;
    
    for (const buffer of fileBuffers) {
        combined.set(new Uint8Array(buffer), offset);
        offset += buffer.byteLength;
    }

    const hashBuffer = await crypto.subtle.digest('SHA-256', combined.buffer);
    return bufferToHex(hashBuffer);
};

const getCache = (): { data: CacheData, lru: string[] } => {
  try {
    const data = JSON.parse(localStorage.getItem(CACHE_DATA_KEY) || '{}');
    const lru = JSON.parse(localStorage.getItem(CACHE_LRU_KEY) || '[]');
    return { data, lru };
  } catch (e) {
    console.error("Failed to read from cache:", e);
    return { data: {}, lru: [] };
  }
};

const setCache = (data: CacheData, lru: string[]): void => {
  try {
    localStorage.setItem(CACHE_DATA_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_LRU_KEY, JSON.stringify(lru));
  } catch (e) {
    console.error("Failed to write to cache:", e);
  }
};

const getFromCache = (key: string): AnalysisResult | null => {
  const { data, lru } = getCache();
  if (data[key]) {
    const newLru = lru.filter(k => k !== key);
    newLru.push(key);
    setCache(data, newLru);
    return data[key];
  }
  return null;
};

const setInCache = (key: string, result: AnalysisResult): void => {
  const { data, lru } = getCache();
  const newLru = lru.filter(k => k !== key);
  
  // Omit isFromCache before storing
  const { isFromCache, ...storableResult } = result;
  data[key] = storableResult;
  newLru.push(key);

  if (newLru.length > MAX_CACHE_SIZE) {
    const keyToRemove = newLru.shift();
    if (keyToRemove) {
      delete data[keyToRemove];
    }
  }

  setCache(data, newLru);
};
// --- END CACHE LOGIC ---


/**
 * Checks for a library on the window object with retries and configures it if necessary.
 * @param libraryName The name of the library on the window object (e.g., 'pdfjsLib').
 * @param retries Number of times to retry.
 * @param delay Delay between retries in milliseconds.
 * @returns A promise that resolves with the library object.
 */
const ensureLibraryLoaded = async (libraryName: string, retries = 5, delay = 300): Promise<any> => {
    for (let i = 0; i < retries; i++) {
        const library = (window as any)[libraryName];
        if (library) {
            // Special configuration for pdf.js worker
            if (libraryName === 'pdfjsLib' && !library.GlobalWorkerOptions.workerSrc) {
                // Use the reliable unpkg CDN for the worker
                library.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.js`;
                console.log("✅ pdf.js initialized and worker configured.");
            }
            return library;
        }
        console.warn(`⏳ Waiting for ${libraryName} to load... (Attempt ${i + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    throw new Error(`The ${libraryName} library failed to load after several attempts. Please check your internet connection and reload the page.`);
};


const parseAnalysisText = (text: string): Omit<AnalysisResult, 'sources' | 'originalContent' | 'originalType' | 'graphData'> => {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  let riskLevel: RiskLevel = RiskLevel.UNKNOWN;
  let summary = "Analysis could not be parsed correctly.";
  const insights: string[] = [];

  const riskLine = lines.find(line => line.startsWith("Risk Level:"));
  if (riskLine) {
    const riskValue = riskLine.replace("Risk Level:", "").trim().toUpperCase();
    if (Object.values(RiskLevel).includes(riskValue as RiskLevel)) {
      riskLevel = riskValue as RiskLevel;
    }
  }

  const summaryIndex = lines.findIndex(line => line.startsWith("Summary:"));
  const detailsIndex = lines.findIndex(line => line.startsWith("Detailed Analysis:"));

  if (summaryIndex !== -1) {
    const endOfSummary = detailsIndex > summaryIndex ? detailsIndex : lines.length;
    summary = lines.slice(summaryIndex, endOfSummary).join(' ').replace("Summary:", "").trim();
  }

  if (detailsIndex !== -1) {
    for (let i = detailsIndex + 1; i < lines.length; i++) {
      if (lines[i].startsWith('- ')) {
        insights.push(lines[i].substring(2).trim());
      }
    }
  }
  
  // Fallback if parsing fails
  if (riskLevel === RiskLevel.UNKNOWN && insights.length === 0 && summary === "Analysis could not be parsed correctly.") {
    return {
        riskLevel: RiskLevel.UNKNOWN,
        summary: "The AI returned a response, but it could not be structured into a clear analysis. Please review the raw text below.",
        insights: text.split('\n').filter(line => line.trim().length > 0)
    };
  }

  return { riskLevel, summary, insights };
};

const parseDeepDiveText = (text: string): Omit<AnalysisResult, 'sources' | 'originalContent' | 'originalType'> => {
  const result: any = {
    riskLevel: RiskLevel.UNKNOWN,
    summary: '',
    insights: [],
    metadata: {},
    imageDescriptions: [],
    graphData: { nodes: [], edges: [] },
    nextSuggestions: [],
    tone: 'N/A',
  };

  // Split by ### headers, ignoring any text before the first one
  const sections = text.split(/###\s+/).slice(1);

  sections.forEach(section => {
    const lines = section.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    
    const header = lines[0].toLowerCase();
    const content = lines.slice(1);

    if (header.startsWith('risk level')) {
      const riskValue = content[0]?.toUpperCase() || 'UNKNOWN';
      if (Object.values(RiskLevel).includes(riskValue as RiskLevel)) {
        result.riskLevel = riskValue as RiskLevel;
      }
    } else if (header.startsWith('summary')) {
      result.summary = content.join('\n');
    } else if (header.startsWith('detailed insights')) {
      result.insights = content.filter(line => line.startsWith('- ')).map(line => line.substring(2).trim());
    } else if (header.startsWith('metadata')) {
        content.forEach(line => {
            if(line.includes(':')){
                const [key, ...valueParts] = line.split(':');
                const value = valueParts.join(':').trim();
                if (key && value && value.toLowerCase() !== 'n/a') {
                    result.metadata[key.trim().toLowerCase().replace(/\s/g, '_')] = value;
                }
            }
        });
    } else if (header.startsWith('image analysis')) {
        result.imageDescriptions = content.filter(line => line.startsWith('- ')).map(line => line.substring(2).trim());
    } else if (header.startsWith('entity & relationship graph')) {
      const fullContent = section; // Use the full section text to capture the code block
      const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
      const match = fullContent.match(jsonRegex);
      if (match && match[1]) {
        try {
          const graphData = JSON.parse(match[1]);
          if (graphData.nodes && graphData.edges) {
            result.graphData = graphData;
          }
        } catch (e) {
          console.error("Failed to parse graph data JSON:", e);
        }
      }
    } else if (header.startsWith('follow-up suggestions')) {
      result.nextSuggestions = content.filter(line => line.startsWith('- ')).map(line => line.substring(2).trim());
    } else if (header.startsWith('tone analysis')) {
      result.tone = content[0] || 'N/A';
    }
  });

  return result;
};


const getPrompt = (content: string, type: 'text' | 'url' | 'image' | 'document'): string => {
  if (type === 'document') {
    return `
      You are an advanced AI system acting as a data science and research expert. Analyze the provided document(s) for credibility, bias, and potential misinformation. Use the Google Search tool to find grounding information and fact-check key claims.

      Perform the following tasks and respond in a structured MARKDOWN format. Use '###' for main headers. IMPORTANT: Do not use any introductory or concluding remarks. Start directly with "### Risk Level".

      ### Risk Level
      [Choose one: LOW, MEDIUM, HIGH, UNKNOWN]

      ### Summary
      [A concise summary of the document's key insights, overall structure, and your findings from the web search.]

      ### Detailed Insights
      - [First important insight, claim, or finding from the text, including fact-checking results.]
      - [Second insight...]
      - [Third insight...]

      ### Metadata
      - Title: [Extracted title or 'N/A']
      - Author: [Extracted author or 'N/A']
      - Page Count: [Extracted page count or 'N/A']
      - Key Topics: [Comma-separated topics or 'N/A']

      ### Image Analysis
      - [Description of first image's theme, objects, and colors. If none, state 'No images found.']
      - [Description of second image...]

      ### Entity & Relationship Graph
      Provide the graph data as a JSON code block. The JSON must contain 'nodes' and 'edges'. If no entities are found, provide an empty structure.
      \`\`\`json
      {
        "nodes": [],
        "edges": []
      }
      \`\`\`

      ### Follow-up Suggestions
      - [First suggested question]
      - [Second suggested question]
      - [Third suggested question]

      ### Tone Analysis
      [Describe the overall tone (e.g., Formal, Informal, Persuasive, Objective).]
    `;
  }
  if (type === 'url') {
    return `
      Analyze the content at the following URL for credibility, safety, and potential misinformation. Assess if the source is trustworthy, authorized, and safe for users. Use the Google Search tool to investigate the website's reputation, domain age, author credibility, and to fact-check the main claims in the content. Provide your analysis in the exact format below, without any introductory or concluding remarks.

      Risk Level: [Choose one: LOW, MEDIUM, HIGH, UNKNOWN]
      Summary: [A brief, one-paragraph summary of your findings. Address the content's accuracy, the source's credibility, and any potential safety concerns like phishing or excessive ads.]
      Detailed Analysis:
      - [First specific point of analysis, e.g., "Website Reputation: The domain is well-known and generally considered reliable/unreliable..."]
      - [Second specific point, e.g., "Author Credibility: The author is/is not a recognized expert in this field..."]
      - [Third specific point, e.g., "Fact-Check: The central claim in the article is supported/contradicted by information from these reputable news sources..."]
      - [Fourth specific point, e.g., "User Experience & Safety: The site does/does not contain intrusive pop-ups, malware warnings, or signs of a phishing attempt..."]

      The URL to analyze is:
      "${content}"
    `;
  }
  
  if (type === 'image') {
    return `
      Analyze the provided image based on the user's question. Assess its authenticity, context, and any signs of manipulation. Use Google Search to find context about the image if necessary. Provide your analysis in the exact format below, without any introductory or concluding remarks.

      Risk Level: [Choose one: LOW, MEDIUM, HIGH, UNKNOWN. Use UNKNOWN if the question is not about risk assessment, e.g., translation.]
      Summary: [A brief, one-paragraph summary answering the user's question and your main findings.]
      Detailed Analysis:
      - [First specific point of analysis, e.g., "Image Forensics: No obvious signs of digital manipulation were detected..."]
      - [Second specific point, e.g., "Contextual Analysis: A reverse image search suggests the photo originates from..."]
      - [Third specific point, e.g., "Answering the user's query directly based on visual information..."]

      The user's question about the image is:
      "${content}"
    `;
  }

  return `
      Analyze the following text for potential misinformation. Use the Google Search tool to find grounding information. Provide your analysis in the exact format below, without any introductory or concluding remarks.

      Risk Level: [Choose one: LOW, MEDIUM, HIGH]
      Summary: [A brief, one-paragraph summary of your findings and the main reason for your risk assessment.]
      Detailed Analysis:
      - [First specific point of analysis. Explain why it's a concern, e.g., "Uses emotionally charged language..."]
      - [Second specific point of analysis, e.g., "Makes a factual claim without citing a credible source..."]
      - [Third specific point of analysis, e.g., "The claim contradicts information from reputable news organizations..."]

      The text to analyze is:
      "${content}"
    `;
};

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export const analyzeContent = async (content: string, type: 'text' | 'url' | 'image' | 'document', files?: File | File[]): Promise<AnalysisResult> => {
  try {
    // --- Caching Logic Integration ---
    const cacheKey = await createCacheKey(type, content, files);
    const cachedResult = getFromCache(cacheKey);

    if (cachedResult) {
      console.log("Serving analysis from cache.");
      return { ...cachedResult, isFromCache: true };
    }
    // --- End Caching Logic Integration ---

    let response: GenerateContentResponse;
    let finalContent = content;
    let sourceFileName: string | undefined;

    if (type === 'document' && Array.isArray(files) && files.length > 0) {
      finalContent = `Analyzed documents: ${files.map(f => f.name).join(', ')}`;
      sourceFileName = files[0].name;
      const prompt = getPrompt('', type); // Content is in file parts, not prompt
      const textPart = { text: prompt };
      const fileParts = await Promise.all(files.map(file => fileToGenerativePart(file)));
      
      response = await ai.models.generateContent({
        model: "gemini-2.5-pro", // Use a more powerful model for multi-modal analysis
        contents: { parts: [textPart, ...fileParts] },
        config: {
          systemInstruction: "You are a secured research assistant and data scientist. Your goal is to provide a neutral, fact-based analysis of a document to identify potential misinformation without making definitive judgments. You must also extract entities and relationships. Your tone should be formal, objective, and helpful. Your output must be a single, valid markdown document as per the user's prompt.",
          tools: [{ googleSearch: {} }],
        },
      });
    } else if (type === 'image' && files && !Array.isArray(files)) {
        const file = files as File;
        sourceFileName = file.name;
        const prompt = getPrompt(content, type);
        const imagePart = await fileToGenerativePart(file);
        const textPart = { text: prompt };
        response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [textPart, imagePart] },
            config: {
              systemInstruction: "You are a secured research assistant specializing in visual content analysis. Your goal is to provide a neutral, fact-based analysis of images to identify potential misinformation, assess context, and answer user questions without making definitive judgments. Your tone should be formal, objective, and helpful.",
              tools: [{ googleSearch: {} }],
            },
        });
    } else {
        const prompt = getPrompt(content, type);
        response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              systemInstruction: "You are a secured research assistant. Your goal is to provide a neutral, fact-based analysis of content to identify potential misinformation without making definitive judgments. Your tone should be formal, objective, and helpful.",
              tools: [{ googleSearch: {} }],
            },
        });
    }

    let parsedResult: Omit<AnalysisResult, 'sources' | 'originalContent' | 'originalType'>;


    if (type === 'document') {
        parsedResult = parseDeepDiveText(response.text);
    } else {
        parsedResult = parseAnalysisText(response.text);
    }
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = groundingChunks
        .map((chunk: any) => ({
            uri: chunk.web?.uri || '',
            title: chunk.web?.title || 'Unknown Source'
        }))
        .filter((source: GroundingSource) => source.uri);
    
    // Deduplicate sources
    const uniqueSources = Array.from(new Map(sources.map(item => [item.uri, item])).values());

    const finalResult: AnalysisResult = { 
      ...parsedResult, 
      sources: uniqueSources, 
      originalContent: finalContent,
      originalType: type,
      sourceFileName,
    };
    
    // Store result in cache before returning
    setInCache(cacheKey, finalResult);

    return finalResult;

  } catch (error: any)
 {
    console.error("Error in analyzeContent:", error);
    // Re-throw specific errors or a generic one
    if (error.message.includes("is not supported") || error.message.includes("library failed to load")) {
        throw error;
    }
    throw new Error("Failed to get analysis from the AI model.");
  }
};


export const startChat = (analysis: AnalysisResult): Chat => {
  let modelIntro = `Understood. I have analyzed the content and provided the following assessment:\n\nRisk Level: ${analysis.riskLevel}\nSummary: ${analysis.summary}\nKey Insights: \n- ${analysis.insights.join('\n- ')}\n\nI am ready to answer your follow-up questions.`;
  
  if (analysis.nextSuggestions && analysis.nextSuggestions.length > 0) {
    modelIntro += `\n\nYou could start by asking:\n- "${analysis.nextSuggestions[0]}"\n- "${analysis.nextSuggestions[1]}"`;
  }

  const history = [
    {
      role: 'user',
      parts: [{ text: analysis.originalType === 'image' 
        ? `I analyzed an image with the following question: "${analysis.originalContent}"` 
        : analysis.originalType === 'document'
        ? `I have analyzed one or more documents. I will now ask questions about their combined content.`
        : `Here is the ${analysis.originalType} I analyzed:\n\n${analysis.originalContent}` 
      }]
    },
    {
      role: 'model',
      parts: [{ text: modelIntro }]
    }
  ];

  const chat = ai.chats.create({
    model: 'gemini-2.5-flash',
    history: history,
    config: {
      systemInstruction: "You are a secured research assistant. The user has just received an analysis of a piece of content. Your role is to answer their follow-up questions about this analysis or the topic in a neutral, fact-based manner. Do not make definitive judgments. Be helpful and objective.",
    }
  });

  return chat;
};