
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, Volume2, Loader2, Square, Globe, ChevronDown, Play, Trash2, Check } from 'lucide-react';
import { ConnectionStatus } from '../types';
import { MURF_VOICES, SUPPORTED_LANGUAGES } from '../constants';
import { generateMurfAudio } from '../services/murfService';

interface ControlsProps {
  status: ConnectionStatus;
  onToggleMic: () => void;
  onCancelListening?: () => void;
  onSendMessage: (text: string) => void;
  selectedVoice: string;
  onVoiceChange: (voiceId: string) => void;
  selectedLanguage: string;
  onLanguageChange: (langCode: string) => void;
  onStopAudio: () => void;
  onClearChat: () => void;
}

const Controls: React.FC<ControlsProps> = ({ 
  status, 
  onToggleMic, 
  onCancelListening,
  onSendMessage, 
  selectedVoice, 
  onVoiceChange,
  selectedLanguage,
  onLanguageChange,
  onStopAudio,
  onClearChat
}) => {
  const [inputText, setInputText] = useState('');
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [previewState, setPreviewState] = useState<{ id: string; status: 'loading' | 'playing' } | null>(null);
  
  const previewTimeoutRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsVoiceMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize AudioContext for UI Sounds
  useEffect(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  // Stop preview if status changes (e.g. mic clicked)
  useEffect(() => {
    if (status !== ConnectionStatus.IDLE) {
        stopPreview();
    }
  }, [status]);

  const stopPreview = () => {
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    if (previewAudio) {
        previewAudio.pause();
        previewAudio.currentTime = 0;
        setPreviewState(null);
    }
  };

  const playUiSound = (type: 'hover' | 'start' | 'complete') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'hover') {
      // Very subtle tick (Immediate feedback)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);
      gain.gain.setValueAtTime(0.02, now); 
      gain.gain.linearRampToValueAtTime(0, now + 0.03);
      osc.start(now);
      osc.stop(now + 0.03);
    } else if (type === 'start') {
      // Rising chime (Preview fetch started)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else {
      // Complete ping (Audio finished)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && status === ConnectionStatus.IDLE) {
      stopPreview();
      onSendMessage(inputText);
      setInputText('');
    }
  };
  
  const handleMicClick = () => {
      stopPreview();
      onToggleMic();
  };

  const handleVoiceHover = (voiceId: string) => {
    playUiSound('hover'); // Immediate tick
    
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    
    // Debounce: Only fetch if hovered for 800ms
    previewTimeoutRef.current = setTimeout(async () => {
      if (status !== ConnectionStatus.IDLE) return;
      if (previewState?.id === voiceId) return;

      playUiSound('start'); // Distinct "Start" chime

      try {
        setPreviewState({ id: voiceId, status: 'loading' });
        
        if (previewAudio) {
          previewAudio.pause();
          previewAudio.currentTime = 0;
        }
        
        const audioUrl = await generateMurfAudio("System online. Voice ready.", voiceId);
        const audio = new Audio(audioUrl);
        audio.volume = 0.6;
        
        audio.onended = () => {
            setPreviewState(null);
            playUiSound('complete'); // Distinct "Finish" ping
        };
        
        audio.onerror = () => setPreviewState(null);
        await audio.play();
        setPreviewAudio(audio);
        setPreviewState({ id: voiceId, status: 'playing' });
      } catch (err) {
        console.error("Preview failed", err);
        setPreviewState(null);
      }
    }, 800);
  };

  const handleVoiceLeave = () => {
      if(previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
  };

  const handleClearClick = () => {
    if (window.confirm("⚠️ Confirm Clear\n\nThis will permanently delete the entire conversation history from local storage. This action cannot be undone.")) {
        onClearChat();
    }
  }

  const isProcessing = status === ConnectionStatus.PROCESSING;
  const isListening = status === ConnectionStatus.LISTENING;
  const isSpeaking = status === ConnectionStatus.SPEAKING;
  const currentVoiceName = MURF_VOICES.find(v => v.id === selectedVoice)?.name || 'Select Voice';

  const groupedLanguages = SUPPORTED_LANGUAGES.reduce((acc, lang) => {
      const base = lang.name.split('(')[0].trim();
      if (!acc[base]) acc[base] = [];
      acc[base].push(lang);
      return acc;
  }, {} as Record<string, typeof SUPPORTED_LANGUAGES>);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4 z-20">
      
      {/* Settings Row */}
      <div className="flex flex-wrap justify-center gap-3 mb-6 relative z-50">
        
        {/* Language Selector */}
        <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Globe className="h-3.5 w-3.5 text-neon-cyan opacity-70" />
            </div>
            <select 
                value={selectedLanguage}
                onChange={(e) => onLanguageChange(e.target.value)}
                disabled={status !== ConnectionStatus.IDLE}
                className="appearance-none bg-neon-panel border border-neon-border text-gray-300 py-1.5 pl-9 pr-8 rounded-lg text-xs font-mono focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/50 cursor-pointer disabled:opacity-50 hover:border-gray-500 transition-colors w-44 shadow-lg backdrop-blur-sm"
            >
                {Object.entries(groupedLanguages).map(([base, langs]) => (
                    <optgroup key={base} label={base}>
                        {langs.map(lang => (
                            <option key={lang.code} value={lang.code}>
                                {lang.name}
                            </option>
                        ))}
                    </optgroup>
                ))}
            </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
              <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
        </div>

        {/* Voice Dropdown */}
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => status === ConnectionStatus.IDLE && setIsVoiceMenuOpen(!isVoiceMenuOpen)}
                disabled={status !== ConnectionStatus.IDLE}
                className="flex items-center gap-2 bg-neon-panel border border-neon-border text-gray-300 py-1.5 pl-3 pr-4 rounded-lg text-xs font-mono focus:outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink/50 cursor-pointer disabled:opacity-50 hover:border-gray-500 transition-colors min-w-[180px] justify-between shadow-lg backdrop-blur-sm"
            >
                <div className="flex items-center gap-2">
                  <Volume2 className="h-3.5 w-3.5 text-neon-pink opacity-70" />
                  <span>{currentVoiceName}</span>
                </div>
                <ChevronDown className={`h-3 w-3 transition-transform ${isVoiceMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isVoiceMenuOpen && (
              <div className="absolute top-full mt-2 left-0 w-64 bg-neon-surface border border-neon-border rounded-lg shadow-2xl overflow-hidden z-50 backdrop-blur-xl">
                <div className="p-2 text-[10px] text-gray-500 uppercase font-mono border-b border-neon-border bg-black/20">
                  Hover to Preview
                </div>
                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                  {MURF_VOICES.map(voice => {
                    const isSelected = selectedVoice === voice.id;
                    return (
                        <div 
                        key={voice.id}
                        onClick={() => {
                            onVoiceChange(voice.id);
                            setIsVoiceMenuOpen(false);
                        }}
                        onMouseEnter={() => handleVoiceHover(voice.id)}
                        onMouseLeave={handleVoiceLeave}
                        className={`
                            px-4 py-3 text-sm cursor-pointer flex items-center justify-between group transition-all duration-200 border-b border-white/5 last:border-0
                            ${isSelected ? 'bg-neon-pink/10 text-neon-pink' : 'text-gray-300 hover:bg-neon-border'}
                        `}
                        >
                        <div className="flex items-center gap-2">
                            {isSelected && <Check className="w-3 h-3" />}
                            <span className={isSelected ? "font-bold" : ""}>{voice.name}</span>
                        </div>
                        
                        {previewState?.id === voice.id && previewState.status === 'loading' && (
                            <Loader2 className="w-3 h-3 animate-spin text-neon-pink" />
                        )}
                        {previewState?.id === voice.id && previewState.status === 'playing' && (
                            <Volume2 className="w-3 h-3 text-neon-cyan animate-pulse" />
                        )}
                        {previewState?.id !== voice.id && (
                            <Play className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                        )}
                        </div>
                    );
                  })}
                </div>
              </div>
            )}
        </div>

        {/* Clear Chat Button */}
        <button
            onClick={handleClearClick}
            className="flex items-center justify-center w-10 bg-neon-panel border border-neon-border rounded-lg text-gray-400 hover:text-red-400 hover:border-red-900 hover:bg-red-950/30 transition-all shadow-lg"
            title="Clear History"
        >
            <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Main Interaction Buttons */}
      <div className="flex justify-center items-center gap-6 mb-8 relative h-24">
        
        {isSpeaking && (
            <button
                onClick={(e) => { e.preventDefault(); onStopAudio(); }}
                className="absolute right-[10%] md:right-[25%] p-3 rounded-full bg-red-950/80 border border-red-500 text-red-200 hover:bg-red-900 hover:scale-110 transition-all shadow-lg z-40 animate-in fade-in zoom-in duration-300 backdrop-blur-sm"
                title="Stop Speaking"
            >
                <Square className="w-5 h-5 fill-current" />
            </button>
        )}

        <button
          onClick={handleMicClick}
          disabled={isProcessing || isSpeaking}
          className={`
            relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 z-30
            ${isListening 
              ? 'bg-red-600 shadow-[0_0_40px_rgba(220,38,38,0.6)] animate-pulse scale-110 text-white ring-4 ring-red-500/20' 
              : isProcessing
                ? 'bg-neon-surface border border-neon-border cursor-wait ring-4 ring-neon-cyan/10'
                : isSpeaking
                  ? 'bg-neon-surface/50 border border-neon-border opacity-50'
                  : 'bg-neon-cyan/5 border border-neon-cyan/40 hover:bg-neon-cyan/10 hover:scale-105 shadow-[0_0_25px_rgba(56,189,248,0.2)] ring-1 ring-white/5'
            }
          `}
        >
          {isListening ? (
            <MicOff className="w-8 h-8" />
          ) : isProcessing ? (
            <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
          ) : isSpeaking ? (
            <Volume2 className="w-8 h-8 text-neon-pink animate-pulse" />
          ) : (
            <Mic className="w-8 h-8 text-neon-cyan" />
          )}
          
          <span className="absolute -bottom-8 text-[10px] font-mono text-gray-500 tracking-[0.2em] uppercase min-w-max">
            {status === ConnectionStatus.IDLE ? 'READY' : status}
          </span>
        </button>
      </div>

      {/* Text Input Area */}
      <form onSubmit={handleSend} className="flex gap-4 items-center bg-neon-panel/80 backdrop-blur-md border border-neon-border p-2 rounded-xl shadow-2xl group focus-within:border-neon-cyan/50 transition-colors">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message manually..."
          disabled={status === ConnectionStatus.PROCESSING || status === ConnectionStatus.SPEAKING}
          onFocus={() => {
              if (status === ConnectionStatus.LISTENING && onCancelListening) {
                  onCancelListening();
              }
          }}
          className="flex-1 bg-transparent text-gray-200 font-sans outline-none px-4 py-2 placeholder-gray-600 disabled:opacity-50 text-sm md:text-base"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || status !== ConnectionStatus.IDLE}
          className="p-2.5 bg-neon-surface hover:bg-neon-cyan/20 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-neon-cyan border border-transparent hover:border-neon-cyan/30"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default Controls;
