import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, User } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

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

  const processAICommand = (query: string, role: string): React.ReactNode => {
    const text = query.toLowerCase();

    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      if (text.includes('thống kê')) {
        const availableEquip = equipment.filter(e => e.status === 'AVAILABLE').length;
        const pendingBookings = bookings.filter(b => b.status === 'PENDING').length;
        return (
          <div className="space-y-1">
            <p>📊 <strong>Thống kê nhanh:</strong></p>
            <ul className="list-disc pl-4 text-sm">
              <li>Thiết bị rảnh: <strong>{availableEquip}</strong></li>
              <li>Đơn đang chờ duyệt: <strong>{pendingBookings}</strong></li>
            </ul>
          </div>
        );
      }
      
      if (text.includes('phê duyệt tất cả')) {
        onAction('approve-all');
        return '✅ Đã gửi lệnh phê duyệt tất cả các đơn chờ!';
      }
      
      if (text.includes('tìm thiết bị')) {
        // Lấy từ khóa sau chữ "tìm thiết bị"
        const keywordMatch = text.match(/tìm thiết bị (.*)/);
        if (keywordMatch && keywordMatch[1]) {
          const keyword = keywordMatch[1].trim();
          const found = equipment.filter(e => e.name.toLowerCase().includes(keyword));
          if (found.length === 0) return `Không tìm thấy thiết bị nào có tên "${keyword}".`;
          return (
            <div>
              <p>🔍 Kết quả tìm kiếm:</p>
              <ul className="list-disc pl-4 text-sm">
                {found.slice(0, 5).map(e => (
                  <li key={e.id}>{e.name} - {e.status}</li>
                ))}
              </ul>
            </div>
          );
        }
        return 'Vui lòng nhập tên thiết bị cần tìm. Ví dụ: tìm thiết bị máy tính';
      }

      if (text.includes('hủy booking') || text.includes('hủy đơn')) {
        const idMatch = text.match(/\d+/);
        if (idMatch && idMatch[0]) {
          const id = parseInt(idMatch[0], 10);
          onAction('cancel-booking', { id });
          return `⏳ Đang gửi lệnh hủy đơn số #${id}...`;
        }
        return 'Vui lòng cung cấp ID đơn cần hủy. Ví dụ: hủy booking 12';
      }
    } else {
      // Role STUDENT hoặc LECTURER
      if (text.includes('thống kê') || text.includes('phê duyệt tất cả') || text.includes('hủy booking')) {
        return '❌ Bạn không có quyền truy cập lệnh này.';
      }

      if (text.includes('lịch của tôi')) {
        // Lưu ý: bookings ở đây nên được Component cha lọc sẵn những đơn của user hiện tại
        const myBookings = bookings.slice(0, 3); 
        if (myBookings.length === 0) return 'Bạn không có lịch đặt nào gần đây.';
        return (
          <div>
            <p>📅 Lịch đặt gần nhất của bạn:</p>
            <ul className="list-disc pl-4 text-sm mt-1">
              {myBookings.map(b => (
                <li key={b.id}>Đơn #{b.id} - Trạng thái: {b.status}</li>
              ))}
            </ul>
          </div>
        );
      }

      if (text.includes('thiết bị') || text.includes('rảnh')) {
        const availableEquip = equipment.filter(e => e.status === 'AVAILABLE').slice(0, 5);
        if (availableEquip.length === 0) return 'Hiện không có thiết bị nào đang rảnh.';
        return (
          <div>
            <p>💡 Top 5 thiết bị đang rảnh:</p>
            <ul className="list-disc pl-4 text-sm mt-1">
              {availableEquip.map(e => (
                <li key={e.id}>{e.name}</li>
              ))}
            </ul>
          </div>
        );
      }
    }

    return 'Xin lỗi, tôi chưa hiểu lệnh này. Bạn có thể thử: "thống kê", "lịch của tôi", "tìm thiết bị [tên]".';
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: inputValue
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');

    // Giả lập AI thinking
    setTimeout(() => {
      const responseContent = processAICommand(currentInput, userRole);
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        content: responseContent
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 500);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-[#1E5FA5] hover:bg-[#154a85] text-white rounded-full shadow-lg transition-transform hover:scale-105 z-50 flex items-center justify-center animate-bounce-short"
      >
        <Bot className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[350px] h-[500px] bg-white rounded-xl shadow-2xl border border-[#E0E0E0] z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
      {/* Header */}
      <div className="bg-[#1E5FA5] text-white p-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <span className="font-semibold text-sm">Trợ lý AI LabBook</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1 p-4 bg-[#F9FAFB]">
        <div className="space-y-4 pr-3" ref={scrollRef}>
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-[14px] ${
                msg.sender === 'user' 
                  ? 'bg-[#1E5FA5] text-white rounded-br-sm' 
                  : 'bg-white text-[#212121] border border-[#E0E0E0] rounded-bl-sm shadow-sm'
              }`}>
                {msg.sender === 'ai' && <div className="flex items-center gap-1 mb-1 text-[#757575] text-xs font-medium"><Bot className="w-3 h-3"/> AI Assistant</div>}
                {msg.content}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-[#E0E0E0]">
        <form 
          onSubmit={e => { e.preventDefault(); handleSend(); }}
          className="flex items-center gap-2"
        >
          <input 
            type="text" 
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Nhập lệnh (vd: thống kê)..."
            className="flex-1 bg-[#F5F5F5] border border-transparent focus:bg-white focus:border-[#1E5FA5] rounded-full px-4 py-2 text-[14px] outline-none transition-colors"
          />
          <button 
            type="submit"
            disabled={!inputValue.trim()}
            className="p-2 bg-[#1E5FA5] text-white rounded-full hover:bg-[#154a85] disabled:opacity-50 disabled:hover:bg-[#1E5FA5] transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
