import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X } from 'lucide-react';
import apiClient from '../../services/apiClient';

export interface BookingData {
  id: number;
  status: string;
  [key: string]: any;
}

export interface EquipmentData {
  id: number;
  name: string;
  status: string;
  [key: string]: any;
}

interface AIAssistantProps {
  userRole: string;
  bookings?: BookingData[];
  equipment?: EquipmentData[];
  onAction: (actionName: string, payload?: any) => void;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  content: React.ReactNode;
}

export function AIAssistant({ userRole, bookings = [], equipment = [], onAction }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'ai', content: 'Xin chào! Tôi là Trợ lý LabBook. Tôi có thể giúp gì cho bạn?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: inputValue
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');

    try {
      const response = await apiClient.post('/api/chat', {
        message: currentInput,
        role: userRole,
        context: {
          bookings,
          equipment
        }
      });

      const { reply, action, payload } = response.data;

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        content: reply
      };
      setMessages(prev => [...prev, aiMessage]);

      if (action) {
        onAction(action, payload);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        content: "Xin lỗi, não bộ AI của tôi đang gặp chút sự cố kết nối."
      }]);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-[#1E5FA5] dark:bg-blue-600 hover:bg-[#154a85] dark:hover:bg-blue-700 text-white rounded-full shadow-lg dark:shadow-slate-900/50 transition-transform hover:scale-105 z-50 flex items-center justify-center animate-bounce-short"
      >
        <Bot className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[350px] h-[500px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl dark:shadow-slate-900/50 border border-[#E0E0E0] dark:border-slate-800 z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
      {/* Header */}
      <div className="bg-[#1E5FA5] dark:bg-blue-600 text-white p-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <span className="font-semibold text-sm">Trợ lý AI LabBook</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white hover:bg-white dark:bg-slate-900/10 p-1 rounded transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#F9FAFB] dark:bg-slate-900/50">
        <div className="space-y-4 pr-3" ref={scrollRef}>
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-[14px] ${
                msg.sender === 'user' 
                  ? 'bg-[#1E5FA5] dark:bg-blue-600 text-white rounded-br-sm' 
                  : 'bg-white dark:bg-slate-900 text-[#212121] dark:text-slate-100 border border-[#E0E0E0] dark:border-slate-800 rounded-bl-sm shadow-sm dark:shadow-slate-900/50'
              }`}>
                {msg.sender === 'ai' && <div className="flex items-center gap-1 mb-1 text-[#757575] dark:text-slate-400 text-xs font-medium"><Bot className="w-3 h-3"/> AI Assistant</div>}
                {msg.content}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-[#E0E0E0] dark:border-slate-800">
        <form 
          onSubmit={e => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2"
        >
          <input 
            type="text" 
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Nhập lệnh (vd: thống kê)..."
            className="flex-1 bg-[#F5F5F5] dark:bg-slate-800/50 border border-transparent focus:bg-white dark:bg-slate-900 focus:border-[#1E5FA5] dark:focus:border-blue-500 rounded-full px-4 py-2 text-[14px] outline-none transition-colors"
          />
          <button 
            type="submit"
            disabled={!inputValue.trim()}
            className="p-2 bg-[#1E5FA5] dark:bg-blue-600 text-white rounded-full hover:bg-[#154a85] dark:hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-[#1E5FA5] dark:bg-blue-600 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
