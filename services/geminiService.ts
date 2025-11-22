import { GoogleGenAI, Chat } from "@google/genai";
import { GEMINI_MODEL, SYSTEM_INSTRUCTION } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

let chatSession: Chat | null = null;
let currentLanguage: string | null = null;

/**
 * Initializes or retrieves the active chat session.
 * Resets session if language changes to ensure system instruction is updated.
 */
const getChatSession = (language: string): Chat => {
  // If the language has changed, we must create a new session to inject the correct system instruction
  if (!chatSession || currentLanguage !== language) {
    currentLanguage = language;
    
    // Explicitly enforce language in the system instruction
    const languageInstruction = `\n\nIMPORTANT: The user has selected ${language}. You MUST reply in ${language}.`;
    
    chatSession = ai.chats.create({
      model: GEMINI_MODEL,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + languageInstruction,
      },
    });
  }
  return chatSession;
};

/**
 * Sends a message to Gemini and streams the response.
 * @param text User input text
 * @param language Code of the selected language
 * @param onChunk Callback function triggered when a text chunk arrives
 * @returns The complete generated text
 */
export const streamGeminiReply = async (
  text: string, 
  language: string,
  onChunk: (chunk: string) => void
): Promise<string> => {
  try {
    const chat = getChatSession(language);
    const resultStream = await chat.sendMessageStream({ message: text });
    
    let fullText = "";

    for await (const chunk of resultStream) {
      const chunkText = chunk.text || "";
      fullText += chunkText;
      onChunk(chunkText);
    }
    
    if (!fullText) {
      throw new Error("Empty response from Gemini");
    }

    return fullText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to connect to AI intelligence.");
  }
};

/**
 * Translates text to a target language using Gemini.
 */
export const translateText = async (text: string, targetLanguage: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Translate the following text to ${targetLanguage}. Return only the translated text without quotes or explanations.\n\n"${text}"`,
    });
    return response.text?.trim() || null;
  } catch (error) {
    console.error("Translation failed:", error);
    return null;
  }
};