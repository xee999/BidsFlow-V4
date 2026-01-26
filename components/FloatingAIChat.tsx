import React, { useState } from 'react';
import { MessageSquare, X, Send, Loader2, Sparkles } from 'lucide-react';
import { chatWithBidAssistant } from '../services/gemini.ts';
import { BidRecord } from '../types.ts';

interface FloatingAIChatProps {
  bid: BidRecord;
}

const FloatingAIChat: React.FC<FloatingAIChatProps> = ({ bid }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ q: string; a: string }[]>([]);
  const [input, setInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const q = input;
    setInput("");
    setIsAsking(true);
    const a = await chatWithBidAssistant(q, bid);
    setMessages(prev => [...prev, { q, a }]);
    setIsAsking(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {isOpen ? (
        <div className="bg-white w-[380px] h-[500px] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-[#1E3A5F] p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="text-[#FFC107]" size={18} />
              <span className="font-bold text-sm">Jazz Bids AI Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-full">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <MessageSquare size={40} className="mb-2 opacity-20" />
                <p className="text-xs font-medium">Ask me anything about this bid's requirements or technical details.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className="space-y-2">
                <div className="bg-white border border-slate-200 p-3 rounded-2xl text-xs font-semibold text-slate-700 ml-8">
                  {m.q}
                </div>
                <div className="bg-blue-600 text-white p-3 rounded-2xl text-xs mr-8 shadow-sm leading-relaxed">
                  {m.a}
                </div>
              </div>
            ))}
            {isAsking && (
              <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase animate-pulse">
                <Loader2 size={12} className="animate-spin" /> Thinking...
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-white">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Ask assistant..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D32F2F]"
              />
              <button
                onClick={handleSend}
                disabled={isAsking}
                className="absolute right-2 top-2 p-1.5 bg-[#D32F2F] text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-[#D32F2F] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all group"
        >
          <Sparkles className="group-hover:rotate-12 transition-transform" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
        </button>
      )}
    </div>
  );
};

export default FloatingAIChat;