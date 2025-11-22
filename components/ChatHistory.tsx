
import React, { useEffect, useRef } from 'react';
import { ChatMessage, ConnectionStatus } from '../types';
import { Languages, Cpu, User, Activity } from 'lucide-react';

interface ChatHistoryProps {
  messages: ChatMessage[];
  status: ConnectionStatus;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ messages, status }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages change or text updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in duration-700 opacity-60">
        <div className="w-24 h-24 rounded-full border border-neon-cyan/20 flex items-center justify-center relative mb-6">
            <div className="absolute inset-0 rounded-full border-t border-neon-cyan animate-spin duration-[3s]"></div>
            <div className="w-20 h-20 rounded-full bg-neon-cyan/5 flex items-center justify-center shadow-[0_0_30px_rgba(56,189,248,0.1)]">
                <Cpu className="w-8 h-8 text-neon-cyan opacity-80" />
            </div>
        </div>
        <div className="text-center space-y-2">
            <h3 className="text-neon-cyan font-mono tracking-[0.2em] text-sm">SYSTEM ONLINE</h3>
            <p className="text-xs text-gray-600 font-mono">Waiting for audio input...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 custom-scrollbar scroll-smooth relative min-h-0">
      {messages.map((msg, index) => {
        const isLast = index === messages.length - 1;
        const isAssistant = msg.role === 'assistant';
        
        // Determine if we should show the "Generating Audio" pulse
        // This happens if it's the last message, from the assistant, and we are still in PROCESSING state 
        // (meaning text might be done but audio is fetching)
        const isGeneratingAudio = isLast && isAssistant && status === ConnectionStatus.PROCESSING;

        return (
            <div
                key={msg.id}
                className={`flex w-full ${isAssistant ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2 fade-in duration-500`}
            >
                <div className={`relative max-w-[85%] md:max-w-[75%] flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}>
                    
                    {/* Label / Avatar */}
                    <div className={`flex items-center gap-2 mb-2 ${isAssistant ? 'flex-row' : 'flex-row-reverse'}`}>
                        <div className={`w-6 h-6 rounded-md border flex items-center justify-center shadow-lg transition-all duration-500
                            ${isAssistant 
                                ? isGeneratingAudio ? 'bg-neon-cyan/10 border-neon-cyan animate-pulse ring-2 ring-neon-cyan/20' : 'bg-black border-neon-cyan text-neon-cyan shadow-[0_0_15px_rgba(56,189,248,0.2)]' 
                                : 'bg-neon-surface border-zinc-600 text-gray-300'
                            }`}
                        >
                            {isAssistant ? <Cpu size={14} /> : <User size={14} />}
                        </div>
                        <span className="text-[10px] font-mono text-gray-500 tracking-widest uppercase">
                            {isAssistant ? (isGeneratingAudio ? 'PROCESSING...' : 'NEON AI') : 'YOU'}
                        </span>
                    </div>

                    {/* Message Bubble */}
                    <div
                        className={`
                            relative p-5 text-sm md:text-[15px] leading-relaxed tracking-wide shadow-xl backdrop-blur-md border transition-all duration-300
                            ${isAssistant 
                                ? `rounded-r-2xl rounded-bl-2xl border-l-2 bg-black/40 text-gray-100 border-y-zinc-800/50 border-r-zinc-800/50 ${isGeneratingAudio ? 'border-l-neon-pink shadow-[0_0_20px_rgba(236,72,153,0.15)]' : 'border-l-neon-cyan/50'}`
                                : 'rounded-l-2xl rounded-br-2xl bg-neon-surface border-zinc-700 text-gray-200'
                            }
                        `}
                    >
                        {/* Assistant Glow Effect */}
                        {isAssistant && (
                            <div className={`absolute inset-0 bg-gradient-to-r pointer-events-none rounded-r-2xl transition-opacity duration-500 ${isGeneratingAudio ? 'from-neon-pink/10 opacity-100' : 'from-neon-cyan/10 opacity-100'}`}></div>
                        )}

                        <div className="relative z-10">
                            {msg.text}
                            {isAssistant && isLast && (
                                <span className={`inline-block w-1.5 h-4 ml-1 align-middle rounded-full ${isGeneratingAudio ? 'bg-neon-pink animate-bounce shadow-[0_0_8px_#ec4899]' : 'bg-neon-cyan animate-pulse shadow-[0_0_8px_#38bdf8]'}`}></span>
                            )}
                        </div>

                        {/* Metadata Footer */}
                        <div className="mt-3 pt-2 flex justify-between items-center border-t border-white/5 opacity-50">
                            <span className="text-[9px] font-mono text-gray-500">
                                {new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </span>
                            {isGeneratingAudio && (
                                <div className="flex items-center gap-1.5">
                                    <Activity size={10} className="text-neon-pink animate-pulse" />
                                    <span className="text-[8px] text-neon-pink font-mono tracking-wider">SYNTHESIZING VOICE</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Translation Panel */}
                    {msg.translation && (
                        <div className={`mt-2 max-w-[90%] text-xs bg-black/40 border border-zinc-800/80 p-2.5 rounded-lg flex items-start gap-2 ${isAssistant ? 'ml-1' : 'mr-1'}`}>
                            <Languages className="w-3 h-3 text-gray-500 mt-0.5 shrink-0" />
                            <span className="text-gray-400 italic font-light">{msg.translation}</span>
                        </div>
                    )}
                </div>
            </div>
        );
      })}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
};

export default ChatHistory;
