import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, RefreshCw, MessageSquare, ExternalLink, User, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';

interface AiChatWidgetProps {
  products: Product[];
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
}

export const AiChatWidget: React.FC<AiChatWidgetProps> = ({ products }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'হ্যালো! 👋 আমি VENTEG শপের এআই অ্যাসিস্ট্যান্ট (@venteg_bot)।\n\nআমাদের স্টোরের প্রোডাক্ট, দাম, স্টক বা ডেলিভারি নিয়ে যেকোনো প্রশ্ন করতে পারেন। কীভাবে সাহায্য করতে পারি?',
      time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const getClientFallbackReply = (userQuery: string): string => {
    const q = userQuery.toLowerCase();
    
    if (q.includes('প্রোডাক্ট') || q.includes('লিস্ট') || q.includes('পণ্য') || q.includes('দাম') || q.includes('স্টক') || q.includes('মূল্য')) {
      if (!products || products.length === 0) {
        return "📦 বর্তমানে VENTEG স্টোরে কোনো প্রোডাক্ট যুক্ত করা নেই। স্টোরের এডমিন প্যানেল থেকে সহজে প্রোডাক্ট যুক্ত করা যাবে।";
      }
      let list = "🛒 **VENTEG স্টোরের বর্তমান প্রোডাক্ট তালিকা ও মূল্য:**\n\n";
      products.forEach((p, idx) => {
        const unitStr = p.unit === 'kg' ? 'কেজি' : 'পিস';
        const stockStr = p.stock > 0 ? `${p.stock} ${unitStr} স্টকে আছে` : 'স্টক শেষ';
        list += `${idx + 1}. **${p.name}**\n   • মূল্য: ৳${p.sellingPrice} (প্রতি ${unitStr})\n   • অবস্থা: ${stockStr}\n\n`;
      });
      list += "যেকোনো প্রোডাক্ট অর্ডার করতে 'অর্ডার করুন' বাটনে ক্লিক করুন!";
      return list;
    }

    if (q.includes('পেমেন্ট') || q.includes('অনলাইন') || q.includes('বিকাশ') || q.includes('নগদ') || q.includes('রকেট') || q.includes('টাকা')) {
      return "💳 **অনলাইন সেন্ড মানি পেমেন্ট নির্দেশিকা:**\n\n১. আমাদের বিকাশ, নগদ ও রকেট পারসোনাল নম্বর: **01756447869**\n২. 'সেন্ড মানি' সম্পন্ন করার পর অর্ডার করার সময় আপনার মোবাইল নম্বর ও TrxID ইনপুট দিন।\n\nএছাড়া আপনি **ক্যাশ অন ডেলিভারিতেও (COD)** কেনাকাটা করতে পারবেন!";
    }

    if (q.includes('ডেলিভারি') || q.includes('ক্যাশ') || q.includes('লোকেশন')) {
      return "🚚 **ডেলিভারি সার্ভিস:**\n\nআমরা সারা বাংলাদেশে দ্রুততম সময়ে হোম ডেলিভারি দিয়ে থাকি। অর্ডার নিশ্চিত করার ২৪-৪৮ ঘণ্টার মধ্যে আপনার ঠিকানায় পণ্য পৌঁছে যাবে।";
    }

    return `হ্যালো! 👋 VENTEG AI Assistant এ আপনাকে স্বাগতম।\n\nআমাদের কাছে ${products.length} টি মানসম্মত প্রোডাক্ট রয়েছে। আপনার প্রয়োজনীয় যেকোনো তথ্যের জন্য লিখুন অথবা নিচের বাটনে ক্লিক করুন!`;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputValue;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text.trim(),
          clientProducts: products
        })
      });

      if (!res.ok) {
        throw new Error('API route unavailable');
      }

      const data = await res.json();
      const replyText = data.response || getClientFallbackReply(text.trim());

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: replyText,
        time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      // Fall back to client-side smart response seamlessly
      const fallbackReply = getClientFallbackReply(text.trim());
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: fallbackReply,
          time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Toggle Button */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end" id="ai-chat-floating-container">
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2 bg-gradient-to-r from-slate-900 to-indigo-950 text-white text-[11px] font-bold py-1.5 px-3 rounded-full shadow-lg border border-indigo-700/50 flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-transform"
            onClick={() => setIsOpen(true)}
          >
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
            <span>এআই হেল্প চ্যাট</span>
          </motion.div>
        )}

        <button
          type="button"
          id="btn-toggle-ai-chat"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
            isOpen 
              ? 'bg-rose-600 text-white rotate-90 scale-95' 
              : 'bg-gradient-to-r from-indigo-600 via-emerald-600 to-indigo-700 text-white hover:scale-110 ring-4 ring-emerald-500/20'
          }`}
          title="VENTEG AI Assistant Chat"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <div className="relative">
              <Bot className="w-7 h-7" />
              <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
            </div>
          )}
        </button>
      </div>

      {/* Floating Chat Box Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-4 sm:right-6 w-[92vw] sm:w-[380px] h-[520px] max-h-[80vh] bg-white rounded-3xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden"
            id="ai-chat-window"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 flex items-center justify-between border-b border-indigo-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative p-2 bg-indigo-600/30 rounded-2xl border border-indigo-500/40">
                  <Bot className="w-5 h-5 text-indigo-300" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900"></span>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm flex items-center gap-1.5 text-white">
                    VENTEG AI Assistant
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-md border border-emerald-500/30 font-semibold">
                      Live
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-300 flex items-center gap-1">
                    @venteg_bot • Gemini 3.6
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <a
                  href="https://t.me/venteg_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors text-[10px] flex items-center gap-1 font-bold"
                  title="Telegram এ কথা বলুন"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">Telegram</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Body Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50" id="ai-chat-messages-container">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'ai' && (
                    <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs shadow-xs mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[82%] rounded-2xl p-3 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-none shadow-xs'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none shadow-xs'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <span className={`text-[9px] block mt-1 font-medium ${
                      msg.sender === 'user' ? 'text-emerald-200 text-right' : 'text-slate-400'
                    }`}>
                      {msg.time}
                    </span>
                  </div>

                  {msg.sender === 'user' && (
                    <div className="w-7 h-7 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 text-xs shadow-xs mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-white text-slate-500 border border-slate-200 rounded-2xl rounded-tl-none px-3 py-2 text-xs flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>এআই উত্তর তৈরি করছে...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            <div className="p-2.5 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0" id="chat-quick-chips">
              <button
                type="button"
                onClick={() => handleSendMessage('দোকানের প্রোডাক্ট লিস্ট ও দাম দেখাও')}
                className="bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-colors cursor-pointer shrink-0 flex items-center gap-1 border border-slate-200/60"
              >
                <ShoppingBag className="w-3 h-3 text-indigo-500" />
                প্রোডাক্টের লিস্ট দাও
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('অনলাইন পেমেন্ট কীভাবে করতে হয়?')}
                className="bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-colors cursor-pointer shrink-0 border border-slate-200/60"
              >
                💳 অনলাইন পেমেন্ট নিয়ম
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('ক্যাশ অন ডেলিভারি নিয়ম')}
                className="bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-colors cursor-pointer shrink-0 border border-slate-200/60"
              >
                🚚 ডেলিভারি সিস্টেম
              </button>
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
              id="ai-chat-input-form"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="প্রোডাক্ট বা সাহায্য সম্পর্কিত প্রশ্ন লিখুন..."
                className="flex-1 bg-slate-100 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-2xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-500 font-medium"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || loading}
                className="w-9 h-9 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
