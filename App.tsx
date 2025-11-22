
import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Controls from './components/Controls';
import ChatHistory from './components/ChatHistory';
import AudioVisualizer from './components/AudioVisualizer';
import { streamGeminiReply, translateText } from './services/geminiService';
import { generateMurfAudio } from './services/murfService';
import { ChatMessage, ConnectionStatus } from './types';
import { DEFAULT_VOICE_ID, MURF_VOICES, SUPPORTED_LANGUAGES, MURF_API_KEY } from './constants';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.IDLE);
  const [selectedVoice, setSelectedVoice] = useState<string>(DEFAULT_VOICE_ID);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto'); 
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  
  // Refs for state tracking (to avoid stale closures in callbacks)
  const selectedVoiceRef = useRef<string>(DEFAULT_VOICE_ID);
  
  // Audio Context & Analysis
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  // Source References
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  
  // Speech Recognition
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const transcriptAccumulator = useRef<string>("");

  // --- Persistence Logic ---
  useEffect(() => {
      try {
          const savedMessages = localStorage.getItem('chatHistory');
          const savedVoice = localStorage.getItem('selectedVoice');
          const savedLanguage = localStorage.getItem('selectedLanguage');

          if (savedMessages) setMessages(JSON.parse(savedMessages));
          if (savedVoice && MURF_VOICES.some(v => v.id === savedVoice)) {
              setSelectedVoice(savedVoice);
              selectedVoiceRef.current = savedVoice;
          }
          if (savedLanguage) setSelectedLanguage(savedLanguage);
      } catch (error) {
          console.error("Failed to load persistence:", error);
      }

      if (!process.env.API_KEY || !MURF_API_KEY) {
          setShowApiKeyModal(true);
      }
  }, []);

  useEffect(() => {
      localStorage.setItem('chatHistory', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
      localStorage.setItem('selectedVoice', selectedVoice);
      localStorage.setItem('selectedLanguage', selectedLanguage);
      selectedVoiceRef.current = selectedVoice;
  }, [selectedVoice, selectedLanguage]);


  const initAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7; 
      
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
    }
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const addSystemMessage = (text: string) => {
      const newMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        text,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, newMsg]);
  };

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem('chatHistory');
    setStatus(ConnectionStatus.IDLE);
    stopAudio();
  };

  const handleVoiceChange = (newVoiceId: string) => {
      setSelectedVoice(newVoiceId);
      
      // Only sync language if NOT in Auto mode
      if (selectedLanguage !== 'auto') {
          const voiceParts = newVoiceId.split('-');
          if (voiceParts.length >= 2) {
              const voiceLocale = `${voiceParts[0]}-${voiceParts[1]}`; 
              let targetLang = voiceLocale;
              if (voiceLocale === 'en-UK') targetLang = 'en-GB';

              const supported = SUPPORTED_LANGUAGES.find(l => l.code === targetLang);
              if (supported) {
                  setSelectedLanguage(supported.code);
              }
          }
      }
  };

  // --- AUTO LANGUAGE DETECTION LOGIC ---
  
  // Mocks the "Node.js Backend" detection logic entirely in the client using Gemini.
  const switchLanguageAndVoice = (detectedLangCode: string) => {
    console.log(`[AUTO-DETECT] Gemini Detected Language: ${detectedLangCode}`);
    
    // Use ref to ensure we have the latest selected voice, avoiding stale closure issues
    const currentVoiceId = selectedVoiceRef.current;
    const currentVoiceLangFamily = currentVoiceId.split('-')[0].toLowerCase(); 
    const detectedLangFamily = detectedLangCode.split('-')[0].toLowerCase();

    // CRITICAL FIX: Prioritize User Selection within the same Language Family.
    if (currentVoiceLangFamily === detectedLangFamily) {
        return currentVoiceId;
    }

    // --- INTELLIGENT SWITCHING (Family Mismatch) ---
    
    // 1. Exact Match Voice (e.g. es-MX -> es-MX-cecilia)
    const exactVoice = MURF_VOICES.find(v => v.id.toLowerCase().startsWith(detectedLangCode.toLowerCase()));
    if (exactVoice) {
        console.log(`[AUTO-DETECT] Switching Voice to Exact Match: ${exactVoice.name}`);
        if (selectedLanguage === 'auto') {
             const supportedLang = SUPPORTED_LANGUAGES.find(l => l.code === detectedLangCode);
             if (supportedLang) {
                 setSelectedLanguage(supportedLang.code);
             }
             setSelectedVoice(exactVoice.id);
        }
        return exactVoice.id;
    }

    // 2. Family Match Voice (e.g. es-ES detected -> es-MX voice fallback)
    const familyVoice = MURF_VOICES.find(v => v.id.toLowerCase().startsWith(detectedLangFamily));
    if (familyVoice) {
        console.log(`[AUTO-DETECT] Switching Voice to Family Match: ${familyVoice.name}`);
         if (selectedLanguage === 'auto') {
             const supportedLang = SUPPORTED_LANGUAGES.find(l => l.code === detectedLangCode);
             if (supportedLang) setSelectedLanguage(supportedLang.code);
             setSelectedVoice(familyVoice.id);
        }
        return familyVoice.id;
    }

    return currentVoiceId; 
  };

  const processUserInput = async (text: string) => {
    setStatus(ConnectionStatus.PROCESSING);
    
    // 1. Add User Message
    const userMsgId = uuidv4();
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);

    // 1b. Translate User Message (Async)
    if (selectedLanguage !== 'auto' && !selectedLanguage.startsWith('en')) {
        translateText(text, 'English').then(trans => {
            if (trans) {
                setMessages(prev => prev.map(m => m.id === userMsgId ? { ...m, translation: trans } : m));
            }
        });
    }

    // 2. Create Assistant Placeholder
    const aiMsgId = uuidv4();
    setMessages(prev => [...prev, {
      id: aiMsgId,
      role: 'assistant',
      text: "",
      timestamp: Date.now()
    }]);

    try {
      let rawFullText = "";
      let buffer = "";
      let isTagProcessed = false;
      // Use ref to start with the correct current voice
      let activeVoiceId = selectedVoiceRef.current;
      
      const promptLanguage = selectedLanguage === 'auto' ? 'Auto Detect' : selectedLanguage;

      // 3. Stream Gemini Response
      await streamGeminiReply(text, promptLanguage, (chunk) => {
        rawFullText += chunk;

        if (isTagProcessed) {
            setMessages(prev => prev.map(msg => 
                msg.id === aiMsgId ? { ...msg, text: msg.text + chunk } : msg
            ));
        } else {
            buffer += chunk;
            const tagMatch = buffer.match(/^\[([a-zA-Z]{2}-[a-zA-Z]{2})\]/);
            
            if (tagMatch) {
                const detectedCode = tagMatch[1];
                activeVoiceId = switchLanguageAndVoice(detectedCode);
                
                const cleanContent = buffer.substring(tagMatch[0].length);
                setMessages(prev => prev.map(msg => 
                    msg.id === aiMsgId ? { ...msg, text: cleanContent } : msg
                ));
                isTagProcessed = true;
            } else if (buffer.length > 15) {
                setMessages(prev => prev.map(msg => 
                    msg.id === aiMsgId ? { ...msg, text: buffer } : msg
                ));
                isTagProcessed = true;
            }
        }
      });

      // 4. Audio Generation
      const finalText = rawFullText.replace(/^\[[a-zA-Z]{2}-[a-zA-Z]{2}\]\s*/, '');

      if (finalText.trim()) {
          try {
            const audioUrl = await generateMurfAudio(finalText, activeVoiceId);
            playAudio(audioUrl);
          } catch (murfError: any) {
             console.error("Murf Error:", murfError);
             let friendlyError = "Voice generation failed.";
             if (murfError.message.includes("QUOTA_EXCEEDED")) friendlyError = "⚠️ Murf API Quota Exceeded.";
             else if (murfError.message.includes("AUTH_ERROR")) friendlyError = "⚠️ Murf Authentication Failed.";
             else if (murfError.message.includes("VOICE_ERROR")) friendlyError = "⚠️ Selected Voice Unavailable.";
             
             const errorMsg: ChatMessage = {
               id: uuidv4(),
               role: 'assistant',
               text: `[SYSTEM] ${friendlyError}`,
               timestamp: Date.now()
             };
             setMessages(prev => [...prev, errorMsg]);
             setStatus(ConnectionStatus.IDLE);
          }
      } else {
          setStatus(ConnectionStatus.IDLE);
      }

    } catch (error: any) {
      console.error("Gemini Error:", error);
      setStatus(ConnectionStatus.ERROR);
      addSystemMessage(`System Error: ${error.message || "AI Processing Failed"}`);
      setTimeout(() => setStatus(ConnectionStatus.IDLE), 2000);
    }
  };

  const playAudio = (src: string) => {
    initAudioContext();
    if (!audioContextRef.current || !analyserRef.current) return;

    stopAudio(); 

    setStatus(ConnectionStatus.SPEAKING);

    const audio = new Audio(src);
    audio.crossOrigin = "anonymous"; 
    audioElRef.current = audio;

    const source = audioContextRef.current.createMediaElementSource(audio);
    source.connect(analyserRef.current);
    source.connect(audioContextRef.current.destination);

    audio.onended = () => {
      setStatus(ConnectionStatus.IDLE);
    };

    audio.play().catch(e => {
        console.error("Playback failed", e);
        setStatus(ConnectionStatus.ERROR);
        setTimeout(() => setStatus(ConnectionStatus.IDLE), 1000);
    });
  };

  const stopAudio = () => {
    if (audioElRef.current) {
        audioElRef.current.pause();
        audioElRef.current.currentTime = 0;
        audioElRef.current = null;
    }
    setStatus(ConnectionStatus.IDLE);
  };

  // --- Microphone Logic ---

  const startListening = async () => {
    initAudioContext();
    transcriptAccumulator.current = "";
    stopAudio();
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: { 
                echoCancellation: true, 
                noiseSuppression: true,
                autoGainControl: true
            } 
        });
        
        micStreamRef.current = stream;

        if (audioContextRef.current && analyserRef.current) {
            if (micSourceRef.current) {
                micSourceRef.current.disconnect();
            }
            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);
            micSourceRef.current = source;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Web Speech API not supported. Try Chrome.");
            stopListening();
            return;
        }

        const recognition = new SpeechRecognition();
        
        if (selectedLanguage === 'auto') {
            recognition.lang = navigator.language || 'en-US';
        } else {
            recognition.lang = selectedLanguage; 
        }
        
        recognition.continuous = true; 
        recognition.interimResults = true;

        recognition.onstart = () => setStatus(ConnectionStatus.LISTENING);

        recognition.onresult = (event: any) => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                transcriptAccumulator.current += finalTranscript + " ";
            }

            // Silence detection (1s)
            silenceTimerRef.current = setTimeout(() => {
                stopListening();
                const fullText = (transcriptAccumulator.current + interimTranscript).trim();
                if (fullText) {
                    processUserInput(fullText);
                } else {
                    setStatus(ConnectionStatus.IDLE);
                }
            }, 1000); 
        };

        recognition.onerror = (event: any) => {
            if (event.error !== 'no-speech') {
                console.error("Speech error", event.error);
                stopListening();
                setStatus(ConnectionStatus.IDLE);
            }
        };

        recognitionRef.current = recognition;
        recognition.start();

    } catch (err) {
        console.error("Error accessing microphone:", err);
        setStatus(ConnectionStatus.ERROR);
        setTimeout(() => setStatus(ConnectionStatus.IDLE), 2000);
    }
  };

  const stopListening = () => {
    if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
    }
    if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
    }
    if (micSourceRef.current) {
        micSourceRef.current.disconnect();
        micSourceRef.current = null;
    }
  };

  const handleToggleMic = () => {
    if (status === ConnectionStatus.IDLE) {
        startListening();
    } else if (status === ConnectionStatus.LISTENING) {
        stopListening();
        const text = transcriptAccumulator.current.trim();
        if (text) processUserInput(text);
        else setStatus(ConnectionStatus.IDLE);
    }
  };

  const handleCancelListening = () => {
    stopListening();
    transcriptAccumulator.current = "";
    setStatus(ConnectionStatus.IDLE);
  };

  return (
    <div className="h-screen bg-neon-dark text-gray-200 flex flex-col overflow-hidden selection:bg-neon-cyan selection:text-black font-sans">
      
      {showApiKeyModal && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-neon-surface border border-red-500/50 p-8 rounded-2xl max-w-md w-full text-center shadow-[0_0_50px_rgba(220,38,38,0.2)]">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">System Credentials Missing</h2>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                    Access to the neural network is restricted.<br/>
                    Please verify <code>process.env.API_KEY</code> (Gemini) and <code>MURF_API_KEY</code> are configured in your environment.
                </p>
            </div>
        </div>
      )}

      <header className="px-6 py-4 flex justify-between items-center border-b border-neon-border bg-neon-panel/50 backdrop-blur-md z-40 shrink-0">
        <div className="flex items-center gap-3">
            <div className="relative w-3 h-3">
                <div className="absolute inset-0 bg-neon-cyan rounded-full animate-ping opacity-75"></div>
                <div className="relative w-3 h-3 bg-neon-cyan rounded-full shadow-[0_0_10px_#38bdf8]"></div>
            </div>
            <h1 className="text-xl font-bold tracking-widest text-white">NEON VOICE <span className="text-neon-cyan">AI</span></h1>
        </div>
        <div className="flex items-center gap-3">
            <span className="hidden md:inline text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                {selectedLanguage === 'auto' ? 'AUTO DETECT' : selectedLanguage} / {status}
            </span>
            <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-4xl mx-auto relative overflow-hidden">
        
        {/* TOP SECTION: Controls & Visualizer */}
        <div className="w-full shrink-0 flex flex-col z-20 bg-neon-dark/30 backdrop-blur-sm border-b border-neon-border/20 shadow-[0_10px_30px_rgba(0,0,0,0.3)] pt-4">
            
            {/* Controls (Input & Mic) now at top */}
            <Controls 
                status={status} 
                onToggleMic={handleToggleMic} 
                onCancelListening={handleCancelListening}
                onSendMessage={processUserInput}
                selectedVoice={selectedVoice}
                onVoiceChange={handleVoiceChange}
                selectedLanguage={selectedLanguage}
                onLanguageChange={setSelectedLanguage}
                onStopAudio={stopAudio}
                onClearChat={handleClearChat}
            />

            {/* Visualizer below Controls */}
             <div className="relative w-full flex flex-col items-center justify-center px-4 mb-4">
                <AudioVisualizer 
                    analyser={analyserRef.current} 
                    isActive={status === ConnectionStatus.LISTENING || status === ConnectionStatus.SPEAKING} 
                />
            </div>
        </div>

        {/* BOTTOM SECTION: Chat History (Fills remaining space) */}
        <ChatHistory messages={messages} status={status} />

      </main>
    </div>
  );
};

export default App;
