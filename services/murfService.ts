
import { MURF_API_KEY } from "../constants";

/**
 * Generates speech from text using Murf AI.
 */
export const generateMurfAudio = async (text: string, voiceId: string): Promise<string> => {
  const url = "https://api.murf.ai/v1/speech/generate";

  // Gen2 voices (Terrell, Natalie, Falcon) work best with explicit modelVersion='GEN2'.
  // Legacy/International voices (Gabriel, Julie, Klaus, etc.) often FAIL with modelVersion='GEN2' 
  // or specific sample rates. We differentiate payload based on voice ID.
  const isGen2 = ['en-US-terrell', 'en-US-natalie', 'en-US-falcon'].includes(voiceId);

  const payload: any = {
    voiceId: voiceId,
    text: text,
    format: "MP3",
    channel: "MONO",
    encodeAsBase64: true
  };

  if (isGen2) {
      // Optimizations for Gen2 Voices
      payload.modelVersion = 'GEN2';
      payload.sampleRate = 24000;
  } else {
      // Legacy/International Voices: Omit modelVersion and sampleRate to let API use safe defaults.
      // This fixes the "Voice generation failed" error for voices like Klaus, Julie, Cecilia.
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "api-key": MURF_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch (e) {
        // Response body might be empty or text
      }
      
      console.error("Murf API Error Response:", errorData);

      // Handle specific Murf errors with actionable messages
      if (response.status === 401 || response.status === 403) {
        throw new Error("AUTH_ERROR: Murf API Key is invalid or expired.");
      }
      if (response.status === 402 || (errorData.message && errorData.message.toLowerCase().includes("quota"))) {
        throw new Error("QUOTA_EXCEEDED: Your Murf AI character limit is reached.");
      }
      if (response.status === 400) {
        if (errorData.message && errorData.message.toLowerCase().includes("voice")) {
             throw new Error(`VOICE_ERROR: The voice '${voiceId}' is currently unavailable.`);
        }
        throw new Error(`INVALID_REQUEST: ${errorData.message || "Bad Request"}`);
      }

      throw new Error(`API_ERROR: Murf AI returned status ${response.status}.`);
    }

    const data = await response.json();
    
    if (data.encodedAudio) {
      return `data:audio/mp3;base64,${data.encodedAudio}`;
    } else if (data.audioFile) {
        return data.audioFile;
    } else {
      throw new Error("DATA_ERROR: No audio data received from Murf.");
    }

  } catch (error: any) {
    console.error("TTS Generation failed:", error);
    throw error;
  }
};
