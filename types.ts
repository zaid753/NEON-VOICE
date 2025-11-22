export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export enum ConnectionStatus {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  PROCESSING = 'PROCESSING',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR'
}

// Murf API Response types
export interface MurfGenerateResponse {
  audioFile: string; // URL to the generated audio file
  encodedAudio: string; // Base64 string if requested
  warning?: string;
  consumption?: number;
  remainingQuota?: number;
}

// Window interface extension for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}