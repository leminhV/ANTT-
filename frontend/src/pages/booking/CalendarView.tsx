import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Lock, Clock, Calendar, Filter, Plus, Info, X } from "lucide-react";
import { bookingService, roomService } from "../../services";
import { format, startOfWeek, addDays, getHours, getDay, differenceInHours, isSameDay } from "date-fns";
import { toast } from "react-hot-toast";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00 to 22:00

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    purpose: "",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "08:00",
    duration: "2",
    room_id: "",
  });

  const currentUserStr = localStorage.getItem("user");
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [bookingsRes, roomsRes] = await Promise.all([
        bookingService.getAll(),
        roomService.getAll()
      ]);
      setBookings(bookingsRes.data || []);
      setRooms(roomsRes.data || []);
      if (roomsRes.data && roomsRes.data.length > 0) {
        setSelectedRooms(roomsRes.data.map((r: any) => r.id));
      }
    } catch (error) {
      // apiClient.ts đã xử lý toast
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRoom = (id: number) => {
    setSelectedRooms(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const DAYS = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(startOfCurrentWeek, i);
    const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return { name: dayNames[getDay(d)], date: format(d, "dd/MM"), fullDate: d };
  });

  // Chuyển đổi bookings thành Record để render
  const gridBookings: Record<string, any> = {};
  
  bookings.forEach(b => {
    if (b.status === "REJECTED") return;
    if (!selectedRooms.includes(b.room_id)) return;

    const start = new Date(b.start_time);
    const end = new Date(b.end_time);
    
    // Check if it falls in the current week view
    DAYS.forEach((day, dayIdx) => {
      if (isSameDay(start, day.fullDate)) {
        const startHour = getHours(start);
        const duration = differenceInHours(end, start) || 1;
        
        let type = "locked";
        if (b.status === "PENDING") {
          type = currentUser && b.user_id === currentUser.id ? "pending" : "locked";
        } else if (b.status === "APPROVED") {
          type = currentUser && b.user_id === currentUser.id ? "approved" : "locked";
        }

        // Fill slots
        for (let i = 0; i < duration; i++) {
          const h = startHour + i;
          if (h >= 7 && h <= 22) {
            gridBookings[`${dayIdx}-${h}`] = {
              type,
              title: b.purpose,
              duration: i === 0 ? duration : undefined, // Only first cell has title and duration
              isTail: i > 0
            };
          }
        }
      }
    });
  });

  const getSlot = (dayIdx: number, hour: number) => {
    return gridBookings[`${dayIdx}-${hour}`];
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const startDate = new Date(`${formData.date}T${formData.startTime}:00`);
      const endDate = new Date(startDate.getTime() + parseInt(formData.duration) * 60 * 60 * 1000);
      
      await bookingService.create({
        purpose: formData.purpose,
        roomId: formData.room_id,
        startTime: startDate,
        endTime: endDate,
      });
      
      toast.success("Đặt phòng thành công! Đang chờ duyệt.");
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      // apiClient.ts đã xử lý toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 max-w-[1400px] mx-auto animate-in fade-in duration-300">
      
      {/* Lọc & Cài đặt (Left Sidebar) - 260px */}
      <div className="w-full md:w-[260px] flex flex-col gap-6 flex-shrink-0">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-[#1E5FA5] hover:bg-[#154a85] text-white py-3 px-4 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-sm text-[14px]"
        >
          <Plus className="w-5 h-5" /> Đặt phòng / Thiết bị
        </button>

        {/* Filter Box */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-[#E0E0E0] dark:border-slate-800 overflow-hidden flex flex-col transition-colors duration-300">
          <div className="p-4 border-b border-[#E0E0E0] dark:border-slate-800 bg-[#F5F5F5] dark:bg-slate-800/50 flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#757575] dark:text-slate-400" />
            <h3 className="text-[14px] font-bold text-[#212121] dark:text-slate-200">Bộ lọc tìm kiếm</h3>
          </div>
          
          <div className="p-4 overflow-y-auto flex-1 space-y-6">
            
            {/* Lọc theo Phòng */}
            <div className="space-y-3">
              <h4 className="text-[13px] font-bold text-[#212121] dark:text-slate-200 uppercase tracking-wide">Phòng Lab</h4>
              <div className="space-y-2">
                {rooms.map((room) => (
                  <label key={room.id} className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={selectedRooms.includes(room.id)}
                      onChange={() => toggleRoom(room.id)}
                      className="w-4 h-4 rounded border-[#E0E0E0] dark:border-slate-700 text-[#1E5FA5] focus:ring-[#1E5FA5]"
                    />
                    <span className="text-[13px] text-[#212121] dark:text-slate-300 group-hover:text-[#1E5FA5] dark:group-hover:text-blue-400 transition-colors">{room.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-[#E0E0E0] dark:border-slate-800 p-4 space-y-3 transition-colors duration-300">
          <h4 className="text-[13px] font-bold text-[#212121] dark:text-slate-200">Chú thích trạng thái</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-white dark:bg-slate-900 border border-[#E0E0E0] dark:border-slate-700 rounded-sm"></div>
              <span className="text-[13px] text-[#757575] dark:text-slate-400">Trống (Có thể đặt)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-[#F5F5F5] dark:bg-slate-800/50 border border-[#E0E0E0] dark:border-slate-700 rounded-sm flex items-center justify-center"><Lock className="w-3 h-3 text-[#9E9E9E] dark:text-slate-500" /></div>
              <span className="text-[13px] text-[#757575] dark:text-slate-400">Đã có người đặt / Khóa</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-[#FFF8E1] dark:bg-yellow-900/30 border border-[#FFE082] dark:border-yellow-700/50 rounded-sm"></div>
              <span className="text-[13px] text-[#757575] dark:text-slate-400">Đang chờ duyệt của bạn</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-[#D6E4F7] dark:bg-blue-900/30 border border-[#1E5FA5] dark:border-blue-700/50 rounded-sm"></div>
              <span className="text-[13px] text-[#757575] dark:text-slate-400">Lịch của bạn (Approved)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Calendar Area */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-[#E0E0E0] dark:border-slate-800 overflow-hidden flex flex-col min-w-0 relative transition-colors duration-300">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <LoadingSpinner size={32} text="Đang tải lịch..." />
          </div>
        )}
        
        {/* Calendar Header */}
        <div className="h-[64px] border-b border-[#E0E0E0] dark:border-slate-800 px-6 flex items-center justify-between bg-white dark:bg-slate-900 flex-shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-[#F5F5F5] dark:bg-slate-800 rounded-md text-[#212121] dark:text-slate-200">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[#212121] dark:text-slate-100">{format(startOfCurrentWeek, "dd/MM/yyyy")} - {format(addDays(startOfCurrentWeek, 6), "dd/MM/yyyy")}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input 
              type="date"
              value={format(currentDate, "yyyy-MM-dd")}
              onChange={(e) => {
                if (e.target.value) {
                  setCurrentDate(new Date(e.target.value));
                }
              }}
              className="px-2 py-1.5 text-[13px] font-medium text-[#212121] dark:text-slate-200 bg-white dark:bg-slate-800 border border-[#E0E0E0] dark:border-slate-700 hover:border-[#1E5FA5] rounded transition-colors focus:outline-none focus:ring-1 focus:ring-[#1E5FA5] cursor-pointer cursor-text color-scheme-light dark:color-scheme-dark"
              title="Chọn một ngày bất kỳ"
            />
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-[13px] font-bold text-[#757575] dark:text-slate-300 bg-white dark:bg-slate-800 border border-[#E0E0E0] dark:border-slate-700 hover:bg-[#F5F5F5] dark:hover:bg-slate-700 hover:text-[#212121] dark:hover:text-white rounded transition-colors"
            >
              Hôm nay
            </button>
            <div className="w-px h-6 bg-[#E0E0E0] dark:bg-slate-700 mx-1"></div>
            <button 
              onClick={() => setCurrentDate(addDays(currentDate, -7))}
              className="p-1.5 text-[#757575] dark:text-slate-400 border border-[#E0E0E0] dark:border-slate-700 hover:bg-[#F5F5F5] dark:hover:bg-slate-700 hover:text-[#212121] dark:hover:text-white rounded transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setCurrentDate(addDays(currentDate, 7))}
              className="p-1.5 text-[#757575] dark:text-slate-400 border border-[#E0E0E0] dark:border-slate-700 hover:bg-[#F5F5F5] dark:hover:bg-slate-700 hover:text-[#212121] dark:hover:text-white rounded transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto bg-[#F5F5F5] dark:bg-slate-950 relative p-4 transition-colors duration-300">
          <div className="min-w-[800px] bg-white dark:bg-slate-900 border border-[#E0E0E0] dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
            
            {/* Days Header Row */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[#E0E0E0] dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-800/50">
              <div className="p-3 border-r border-[#E0E0E0] dark:border-slate-800 flex items-center justify-center">
                <Clock className="w-4 h-4 text-[#9E9E9E] dark:text-slate-500" />
              </div>
              {DAYS.map((d, i) => {
                const isToday = isSameDay(d.fullDate, new Date());
                return (
                  <div key={i} className={`p-3 border-r border-[#E0E0E0] dark:border-slate-800 text-center ${isToday ? 'bg-[#D6E4F7]/30 dark:bg-blue-900/20' : ''}`}>
                    <div className={`text-[14px] font-bold ${isToday ? 'text-[#1E5FA5] dark:text-blue-400' : 'text-[#212121] dark:text-slate-200'}`}>{d.name}</div>
                    <div className={`text-[12px] mt-0.5 ${isToday ? 'text-[#1E5FA5] dark:text-blue-400 font-semibold' : 'text-[#757575] dark:text-slate-400'}`}>{d.date}</div>
                  </div>
                );
              })}
            </div>

            {/* Time Slots */}
            <div className="relative bg-white dark:bg-slate-900">
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] relative group">
                  {/* Time Label */}
                  <div className="h-[60px] border-b border-r border-[#E0E0E0] dark:border-slate-800 flex items-start justify-center pt-2 text-[12px] font-medium text-[#757575] dark:text-slate-500 bg-[#FAFAFA] dark:bg-slate-800/30">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  
                  {/* Day Slots for this hour */}
                  {DAYS.map((_, dayIdx) => {
                    const slot = getSlot(dayIdx, hour);
                    
                    let cellClasses = "border-b border-r border-[#E0E0E0] dark:border-slate-800 transition-all relative h-[60px] p-1 ";
                    let content = null;

                    if (!slot) {
                      cellClasses += "bg-white dark:bg-slate-900 hover:bg-[#F5F5F5] dark:hover:bg-slate-800 cursor-pointer hover:scale-[1.02] hover:z-10 hover:shadow-md";
                    } else if (slot.type === "locked") {
                      cellClasses += "bg-[#F5F5F5] dark:bg-slate-800/50 cursor-not-allowed";
                      if (slot.duration) {
                        content = (
                          <div className="w-full h-full flex items-center justify-center flex-col opacity-60 text-[#757575] dark:text-slate-400">
                            <Lock className="w-4 h-4 mb-1" />
                            <span className="text-[10px] font-medium">Đã đặt</span>
                          </div>
                        );
                      }
                    } else if (slot.type === "pending") {
                      cellClasses += "bg-[#FFF8E1] dark:bg-yellow-900/20 border-l-4 border-l-[#FFC107] dark:border-l-yellow-600 cursor-pointer hover:brightness-95 dark:hover:brightness-110";
                      if (slot.duration) {
                        content = (
                          <div className="w-full h-full p-1 overflow-hidden">
                            <div className="text-[12px] font-bold text-[#F57F17] dark:text-yellow-500 line-clamp-1 leading-tight">{slot.title}</div>
                            <div className="text-[10px] text-[#F57F17] dark:text-yellow-600 mt-1 flex items-center gap-1">
                              <Info className="w-3 h-3" /> Chờ duyệt
                            </div>
                          </div>
                        );
                      }
                    } else if (slot.type === "approved") {
                      cellClasses += "bg-[#D6E4F7] dark:bg-blue-900/30 border-l-4 border-l-[#1E5FA5] dark:border-l-blue-500 cursor-pointer hover:bg-[#C2D6F2] dark:hover:bg-blue-800/40";
                      if (slot.duration) {
                        content = (
                          <div className="w-full h-full p-1 overflow-hidden">
                            <div className="text-[12px] font-bold text-[#1E5FA5] dark:text-blue-400 line-clamp-1 leading-tight">{slot.title}</div>
                            <div className="text-[10px] text-[#1E5FA5] dark:text-blue-500 mt-1 font-medium">Lịch của bạn</div>
                          </div>
                        );
                      }
                    }

                    if (dayIdx === 6) cellClasses = cellClasses.replace("border-r", "");

                    return (
                      <div 
                        key={dayIdx} 
                        className={cellClasses} 
                        onClick={() => {
                          if (!slot) {
                            setFormData(prev => ({ ...prev, date: format(DAYS[dayIdx].fullDate, "yyyy-MM-dd"), startTime: `${hour.toString().padStart(2, '0')}:00` }));
                            setIsModalOpen(true);
                          }
                        }}
                      >
                        {content}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#E0E0E0] flex justify-between items-center bg-[#FAFAFA]">
              <h3 className="font-bold text-[#212121] text-[16px]">Đặt phòng / Thiết bị</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-[#757575] hover:bg-[#E0E0E0] rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateBooking} className="p-6 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Mục đích sử dụng <span className="text-red-500">*</span></label>
                <input 
                  required
                  type="text" 
                  value={formData.purpose}
                  onChange={e => setFormData({...formData, purpose: e.target.value})}
                  placeholder="VD: Thực hành Hóa vô cơ..." 
                  className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5] focus:ring-1 focus:ring-[#1E5FA5]"
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Chọn phòng Lab <span className="text-red-500">*</span></label>
                <select 
                  required
                  value={formData.room_id}
                  onChange={e => setFormData({...formData, room_id: e.target.value})}
                  className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5] focus:ring-1 focus:ring-[#1E5FA5]"
                  disabled={isSubmitting}
                >
                  <option value="">-- Chọn phòng --</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name} (Sức chứa: {r.capacity})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#757575] mb-1">Ngày <span className="text-red-500">*</span></label>
                  <input 
                    required
                    type="date" 
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5]"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#757575] mb-1">Giờ bắt đầu <span className="text-red-500">*</span></label>
                  <input 
                    required
                    type="time" 
                    value={formData.startTime}
                    onChange={e => setFormData({...formData, startTime: e.target.value})}
                    className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5]"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Thời lượng (Giờ) <span className="text-red-500">*</span></label>
                <select 
                  value={formData.duration}
                  onChange={e => setFormData({...formData, duration: e.target.value})}
                  className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5]"
                  disabled={isSubmitting}
                >
                  <option value="1">1 giờ</option>
                  <option value="2">2 giờ</option>
                  <option value="3">3 giờ</option>
                  <option value="4">4 giờ</option>
                  <option value="5">5 giờ</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-[#E0E0E0]">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-[14px] font-medium text-[#757575] hover:bg-[#F5F5F5] rounded-md transition-colors"
                  disabled={isSubmitting}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-[14px] font-bold text-white bg-[#1E5FA5] hover:bg-[#154a85] rounded-md transition-colors flex items-center gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <LoadingSpinner size={16} className="p-0 text-white" />} 
                  {isSubmitting ? "Đang xử lý..." : "Xác nhận đặt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
