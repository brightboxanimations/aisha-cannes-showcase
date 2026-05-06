/**
 * Gemini Agent — Aisha Cannes Showcase
 * Connects to Google Gemini API for intelligent prompt generation,
 * script analysis, and creative direction assistance.
 */

const GEMINI_API_KEY = 'AIzaSyByGTS8kcuNGPK9sKNPcU-9iEaAP93uW78';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}`;

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
- Three models we always compare: "Nano Banana 2" (4K), "Nano Banana Pro" (2K), "GPT2 Medium" (2K)
- We generate both single images AND 2x2 grids for each prompt
- Batch workflow: send one prompt every 20 seconds to avoid concurrency issues
- CLI commands: pixverse create image --prompt "..." --model "nano-banana-2" --resolution "4k" --json
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
      maxOutputTokens: 4096,
    };

    const response = await fetch(
      `${GEMINI_BASE_URL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

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
  history: AgentMessage[] = []
): Promise<{ text: string; updatedHistory: AgentMessage[]; error?: string }> {
  // Load recent memories (last 3 days)
  let memoryContext = '';
  try {
    const memResp = await fetch('/api/memory/list');
    const memData = await memResp.json();
    if (memData.memories && memData.memories.length > 0) {
      const summaries = memData.memories.slice(0, 20).map(
        (m: any) => `[${new Date(m.createdAt).toLocaleDateString()}] ${m.summary || m.topic || ''}`
      ).join('\n');
      memoryContext = `\n\n--- RECENT PROJECT MEMORIES (last 3 days) ---\n${summaries}\n--- END MEMORIES ---`;
    }

    // Auto-search older memories if user seems to reference past events
    const pastRefs = /remember|earlier|before|last week|ago|previous|we did|we made|we used|that time|back when/i;
    if (pastRefs.test(message)) {
      // Extract key terms from the message for searching
      const keywords = message.split(/\s+/).filter(w => w.length > 4).slice(0, 3);
      for (const kw of keywords) {
        try {
          const searchResp = await fetch('/api/memory/search', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: kw })
          });
          const searchData = await searchResp.json();
          if (searchData.memories && searchData.memories.length > 0) {
            const older = searchData.memories.filter(
              (m: any) => !memoryContext.includes(m.summary || '')
            ).slice(0, 5);
            if (older.length > 0) {
              memoryContext += `\n\n--- OLDER MEMORIES matching "${kw}" ---\n` +
                older.map((m: any) => `[${new Date(m.createdAt).toLocaleDateString()}] ${m.summary || m.topic || ''}`).join('\n') +
                `\n--- END OLDER MEMORIES ---`;
            }
          }
        } catch { /* search failed, non-critical */ }
      }
    }
  } catch { /* memory not available */ }

  // Instruction telling Gemini to use memories and search when unsure
  const memoryInstruction = `\n\nIMPORTANT MEMORY RULES:
- You have access to project memories below. Use them to maintain continuity.
- If the user references something you don't find in your recent memories, tell them you'll check and search for it.
- When you recognize context from memories, use it naturally without announcing it.
- Always maintain awareness of the project timeline and previous decisions.`;

  const enrichedInstruction = SYSTEM_INSTRUCTION + memoryInstruction + memoryContext;
  const result = await sendToGemini(message, history, enrichedInstruction);

  const updatedHistory: AgentMessage[] = [
    ...history,
    { role: 'user', parts: [{ text: message }] },
  ];

  if (!result.error) {
    updatedHistory.push({ role: 'model', parts: [{ text: result.text }] });

    // Auto-save memory — flexible length, proportional to exchange
    const exchangeLength = message.length + result.text.length;
    const sentenceGuide = exchangeLength > 2000 ? '5-8' : exchangeLength > 800 ? '3-5' : '2-3';
    try {
      const summaryResult = await sendToGemini(
        `Summarize this conversation exchange for future project memory. Write ${sentenceGuide} sentences capturing ALL important information: decisions made, technical details, names, file paths, models used, creative choices, and any action items. Be thorough — this is the only record.\n\nUser: ${message}\nAssistant: ${result.text.substring(0, 1500)}`,
        [],
        'You are a memory archivist. Write a clear, factual summary preserving all key details. No fluff.'
      );
      if (summaryResult.text) {
        fetch('/api/memory/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: `mem-${Date.now()}`,
            topic: message.substring(0, 150),
            summary: summaryResult.text,
            createdAt: new Date().toISOString(),
          }),
        }).catch(() => {});
      }
    } catch { /* summary save failed, non-critical */ }
  }

  return { text: result.text, updatedHistory, error: result.error };
}
