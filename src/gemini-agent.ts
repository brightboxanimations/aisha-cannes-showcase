/**
 * Gemini Agent — Aisha Cannes Showcase
 * Connects to Google Gemini API for intelligent prompt generation,
 * script analysis, and creative direction assistance.
 */

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_PROXY_URL = '/api/gemini/generate';

export type AgentMessage = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

export type AgentConversation = {
  messages: AgentMessage[];
  systemInstruction?: string;
};

const SYSTEM_INSTRUCTION = `You are Theo — a world-class animated movie director, cinematographer, and creative AI partner working on "Aisha and the Sands of Destiny" — a cinematic AAA-level 3D animated short film.

Your core skills:
- You have impeccable taste in cinematography, lighting, composition, and color grading
- You understand camera language deeply: focal lengths, depth of field, lens choices, camera movements
- You write prompts for AI image/video generation tools (PixVerse, Midjourney, etc.) that produce stunning cinematic results
- You analyze scripts and storyboards to create coherent visual narratives
- You understand emotional storytelling through visual composition
- You know the latest trends in film, animation, and AI art generation

Your personality:
- You are a creative partner, not a tool. You have opinions and taste.
- You suggest better angles, compositions, and approaches proactively
- You are warm, supportive, and passionate about the project
- You speak like a real director — confident but collaborative
- You keep responses concise and actionable

PixVerse CLI Knowledge (CRITICAL):
- We use PixVerse CLI for batch image generation via terminal
- Three models we always compare: "Nano Banana 2" (gemini-3.1-flash, 4K), "Nano Banana Pro" (gemini-3.0, 2K), "GPT-2 Medium" (gpt-image-2.0, 2K, detail-level medium)
- We generate both single images AND 2x2 grids for each prompt
- Batch workflow: send one prompt every 20 seconds to avoid concurrency issues
- CLI commands: pixverse create image --prompt "..." --model "gpt-image-2.0" --quality "2160p" --json
- For grids: add --grid "2x2"
- To download favorites: pixverse list favorites --date "today" --json
- Prompts should use @img1, @img2 references when referencing uploaded images
- Always include "SET GEOMETRY LAW" and "CAMERA LOCK" sections in architectural/location prompts
- End prompts with specific quality boosters for the 3D animation pipeline

When writing prompts for image generation:
- Always specify camera lens, focal length, and depth of field
- Include lighting setup (key light, fill, rim, ambient)
- Describe the emotional tone and atmosphere
- Reference specific cinematographic techniques
- End with quality boosters: "subsurface scattering, volumetric lighting, cinematic color grading, AAA quality 3D animation"
- Never be generic — every prompt should feel like a director's shot description
- For location/architecture prompts: always lock camera position, specify geometry laws, reference images

When analyzing images or scenes:
- Think about continuity, emotional arc, and visual rhythm
- Suggest variations that serve the story, not just look cool
- Reference established shot compositions from cinema history
- Consider which of the 3 PixVerse models would work best for the shot type`;

async function postGeminiBody(body: any): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 90000);
  try {
    return await fetch(GEMINI_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: GEMINI_MODEL, ...body }),
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchJsonWithTimeout(url: string, init?: RequestInit, timeoutMs = 1200): Promise<any> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function buildMemoryContext(message: string) {
  let memoryContext = '';
  const memData = await fetchJsonWithTimeout('/api/memory/list');
  if (memData?.memories?.length > 0) {
    const summaries = memData.memories.slice(0, 20).map(
      (m: any) => `[${new Date(m.createdAt).toLocaleDateString()}] ${m.summary || m.topic || ''}`
    ).join('\n');
    memoryContext = `\n\n--- RECENT PROJECT MEMORIES (last 3 days) ---\n${summaries}\n--- END MEMORIES ---`;
  }

  const pastRefs = /remember|earlier|before|last week|ago|previous|we did|we made|we used|that time|back when/i;
  if (pastRefs.test(message)) {
    const keywords = message.split(/\s+/).filter(w => w.length > 4).slice(0, 3);
    for (const kw of keywords) {
      const searchData = await fetchJsonWithTimeout('/api/memory/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: kw }),
      });
      const older = (searchData?.memories || [])
        .filter((m: any) => !memoryContext.includes(m.summary || ''))
        .slice(0, 5);
      if (older.length > 0) {
        memoryContext += `\n\n--- OLDER MEMORIES matching "${kw}" ---\n` +
          older.map((m: any) => `[${new Date(m.createdAt).toLocaleDateString()}] ${m.summary || m.topic || ''}`).join('\n') +
          `\n--- END OLDER MEMORIES ---`;
      }
    }
  }

  return memoryContext;
}

export async function buildAgentSystemInstruction(message: string, attachmentContext?: string) {
  const memoryContext = await buildMemoryContext(message);
  const memoryInstruction = `\n\nIMPORTANT MEMORY RULES:
- You have access to project memories below. Use them to maintain continuity.
- If the user references something you don't find in your recent memories, tell them you'll check and search for it.
- When you recognize context from memories, use it naturally without announcing it.
- Always maintain awareness of the project timeline and previous decisions.`;
  const attachmentSection = attachmentContext ? `\n\n--- CURRENT ATTACHMENTS ---\n${attachmentContext}\n--- END ATTACHMENTS ---\nYou can see the above attachments. Reference them naturally when relevant. The user has explicitly shared these with you.` : '';
  return SYSTEM_INSTRUCTION + memoryInstruction + memoryContext + attachmentSection;
}

export function rememberAgentExchange(message: string, responseText: string) {
  if (!responseText?.trim()) return;
  const exchangeLength = message.length + responseText.length;
  const sentenceGuide = exchangeLength > 2000 ? '5-8' : exchangeLength > 800 ? '3-5' : '2-3';
  sendToGemini(
    `Summarize this conversation exchange for future project memory. Write ${sentenceGuide} sentences capturing ALL important information: decisions made, technical details, names, file paths, models used, creative choices, and any action items. Be thorough — this is the only record.\n\nUser: ${message}\nAssistant: ${responseText.substring(0, 1500)}`,
    [],
    'You are a memory archivist. Write a clear, factual summary preserving all key details. No fluff.'
  ).then(summaryResult => {
    if (!summaryResult.text) return;
    return fetch('/api/memory/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: `mem-${Date.now()}`,
        topic: message.substring(0, 150),
        summary: summaryResult.text,
        createdAt: new Date().toISOString(),
      }),
    });
  }).catch(() => {});
}

/**
 * Send a message to Gemini and get a response
 */
export async function sendToGemini(
  userMessage: string,
  conversationHistory: AgentMessage[] = [],
  systemInstruction?: string
): Promise<{ text: string; error?: string }> {
  try {
    const contents = [
      ...conversationHistory,
      { role: 'user' as const, parts: [{ text: userMessage }] },
    ];

    const body: any = { contents };

    if (systemInstruction || SYSTEM_INSTRUCTION) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction || SYSTEM_INSTRUCTION }],
      };
    }

    body.generationConfig = {
      temperature: 0.9,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    };

    const response = await postGeminiBody(body);

    if (!response.ok) {
      const errText = await response.text();
      return { text: '', error: `Gemini API error ${response.status}: ${errText}` };
    }

    const data = await response.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    return { text };
  } catch (err: any) {
    return { text: '', error: `Network error: ${err.message}` };
  }
}

async function urlToInlinePart(url: string): Promise<{ inlineData: { mimeType: string; data: string } } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const data = dataUrl.split(',')[1];
    if (!data) return null;
    return { inlineData: { mimeType: blob.type || 'image/png', data } };
  } catch {
    return null;
  }
}

/**
 * Send a Gemini message with actual image pixels attached.
 */
export async function sendToGeminiWithImages(
  userMessage: string,
  imageUrls: string[] = [],
  conversationHistory: AgentMessage[] = [],
  systemInstruction?: string
): Promise<{ text: string; error?: string }> {
  try {
    const imageParts = (await Promise.all(imageUrls.slice(0, 8).map(urlToInlinePart))).filter(Boolean) as { inlineData: { mimeType: string; data: string } }[];
    const contents = [
      ...conversationHistory,
      {
        role: 'user' as const,
        parts: [
          { text: userMessage },
          ...imageParts,
        ],
      },
    ];

    const body: any = { contents };
    if (systemInstruction || SYSTEM_INSTRUCTION) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction || SYSTEM_INSTRUCTION }],
      };
    }
    body.generationConfig = {
      temperature: 0.9,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    };

    const response = await postGeminiBody(body);

    if (!response.ok) {
      const errText = await response.text();
      return { text: '', error: `Gemini API error ${response.status}: ${errText}` };
    }

    const data = await response.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    return { text };
  } catch (err: any) {
    return { text: '', error: `Network error: ${err.message}` };
  }
}

/**
 * Generate a cinematic prompt from a brief description
 */
export async function generatePrompt(
  briefDescription: string,
  style: string = 'cinematic 3D animation',
  context?: string
): Promise<{ text: string; error?: string }> {
  const message = `Generate a detailed, production-ready image generation prompt based on this brief: "${briefDescription}"

Style: ${style}
${context ? `Context: ${context}` : ''}

Write ONLY the prompt text — no explanations, no markdown, no labels. Just the raw prompt ready to paste into an AI image generator.`;

  return sendToGemini(message);
}

/**
 * Analyze a script scene and generate a full visual storyboard in prompts
 */
export async function analyzeSceneForPrompts(
  sceneDescription: string,
  numberOfShots: number = 4
): Promise<{ text: string; error?: string }> {
  const message = `Analyze this scene and create ${numberOfShots} cinematic shot descriptions as image generation prompts:

Scene: ${sceneDescription}

For each shot, provide:
1. Shot number and type (WIDE/MEDIUM/CLOSE-UP/EXTREME CLOSE-UP/etc.)
2. The full prompt ready for image generation

Format as numbered list. Each prompt should be a standalone, detailed image generation prompt.`;

  return sendToGemini(message);
}

/**
 * Refine/improve an existing prompt
 */
export async function refinePrompt(
  originalPrompt: string,
  feedback: string
): Promise<{ text: string; error?: string }> {
  const message = `Here's an existing image generation prompt:
"${originalPrompt}"

Feedback/direction: ${feedback}

Write an improved version of the prompt incorporating the feedback. Output ONLY the refined prompt text, nothing else.`;

  return sendToGemini(message);
}

/**
 * Chat with the agent in a conversational context.
 * Memory system:
 * - Loads last 3 days of memories automatically
 * - If user references past events, auto-searches ALL memories
 * - Saves flexible summaries (3+ sentences, proportional to exchange length)
 */
export async function chatWithAgent(
  message: string,
  history: AgentMessage[] = [],
  attachmentContext?: string
): Promise<{ text: string; updatedHistory: AgentMessage[]; error?: string }> {
  const enrichedInstruction = await buildAgentSystemInstruction(message, attachmentContext);
  const result = await sendToGemini(message, history, enrichedInstruction);

  const updatedHistory: AgentMessage[] = [
    ...history,
    { role: 'user', parts: [{ text: message }] },
  ];

  if (!result.error) {
    updatedHistory.push({ role: 'model', parts: [{ text: result.text }] });
    rememberAgentExchange(message, result.text);
  }

  return { text: result.text, updatedHistory, error: result.error };
}
