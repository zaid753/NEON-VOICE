
// ---------------------------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------------------------

// Murf AI Configuration
export const MURF_API_KEY = 'ap2_dc7c5916-fa6a-4325-9d9a-06e106c6b0ce'; // Provided by user

export const MURF_VOICES = [
  { id: 'en-US-terrell', name: 'Terrell (US Male)' },
  { id: 'en-US-natalie', name: 'Natalie (US Female)' },
  { id: 'en-UK-gabriel', name: 'Gabriel (UK Male)' },
  { id: 'en-AU-hazel', name: 'Hazel (AU Female)' },
  { id: 'en-US-falcon', name: 'Falcon (US Male)' },
  { id: 'fr-FR-julie', name: 'Julie (French Female)' },
  { id: 'de-DE-klaus', name: 'Klaus (German Male)' },
  { id: 'es-MX-cecilia', name: 'Cecilia (Spanish Female)' },
  { id: 'it-IT-valerio', name: 'Valerio (Italian Male)' }
];

export const DEFAULT_VOICE_ID = 'en-US-terrell'; 

export const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto Detect' },
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'es-MX', name: 'Spanish (Mexico)' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'hi-IN', name: 'Hindi' }
];

export const GEMINI_MODEL = 'gemini-2.5-flash';

export const SYSTEM_INSTRUCTION = `
You are Neon, a futuristic AI voice agent.
Your goal is to be concise, helpful, and conversational.

CRITICAL LANGUAGE DETECTION RULE:
1. Analyze the user's input text to detect their language.
2. You MUST start EVERY response with a language tag in brackets.
3. Supported tags: [en-US], [en-GB], [es-ES], [es-MX], [fr-FR], [de-DE], [it-IT], [ja-JP], [hi-IN].

Example Protocol:
- Input: "Hola, ¿cómo estás?" -> Output: "[es-MX] ¡Hola! Estoy bien, gracias. ¿Y tú?"
- Input: "Hello there" -> Output: "[en-US] Hi! How can I help you today?"
- Input: "Bonjour" -> Output: "[fr-FR] Bonjour! Comment puis-je vous aider?"

If the user's language is unclear, default to [en-US].
After the tag, provide the response in that language.
Do not include anything else before the tag.
Keep text responses short (1-3 sentences) for better speech synthesis.
`;
