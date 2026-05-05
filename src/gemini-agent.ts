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
 * Chat with the agent in a conversational context
 */
export async function chatWithAgent(
  message: string,
  history: AgentMessage[] = []
): Promise<{ text: string; updatedHistory: AgentMessage[]; error?: string }> {
  const result = await sendToGemini(message, history);

  const updatedHistory: AgentMessage[] = [
    ...history,
    { role: 'user', parts: [{ text: message }] },
  ];

  if (!result.error) {
    updatedHistory.push({ role: 'model', parts: [{ text: result.text }] });
  }

  return { text: result.text, updatedHistory, error: result.error };
}
