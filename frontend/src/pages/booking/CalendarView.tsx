import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Lock, Clock, Calendar, Filter, Plus, Info, X } from "lucide-react";
import { bookingService, roomService } from "../../services";
import { format, startOfWeek, addDays, getHours, getDay, differenceInHours, isSameDay } from "date-fns";
import { toast } from "react-hot-toast";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { socketService } from "../../services/socket";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00 to 22:00

export function CalendarView() {
  const { t } = useTranslation();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
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

  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday

  useEffect(() => {
    fetchData();
  }, [startOfCurrentWeek.getTime(), refreshTrigger]);

  useEffect(() => {
    const socket = socketService.connect();
    if (!socket) return;
    
    const onCalendarUpdated = () => {
      // Trigger a re-fetch of the calendar data
      setRefreshTrigger(prev => prev + 1);
    };
    
    socket.on('calendar_updated', onCalendarUpdated);
    
    return () => {
      socket.off('calendar_updated', onCalendarUpdated);
    };
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const endOfCurrentWeek = addDays(startOfCurrentWeek, 6);
      const startDateStr = format(startOfCurrentWeek, "yyyy-MM-ddT00:00:00");
      const endDateStr = format(endOfCurrentWeek, "yyyy-MM-ddT23:59:59");

      const [bookingsRes, roomsRes] = await Promise.all([
        bookingService.getAll(startDateStr, endDateStr),
        roomService.getAll()
      ]);
      setBookings(bookingsRes.data || []);
      setRooms(roomsRes.data || []);
      if (roomsRes.data && roomsRes.data.length > 0) {
        setSelectedRooms(roomsRes.data.map((r: any) => r.id));
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || t("calendar_load_error");
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRoom = (id: number) => {
    setSelectedRooms(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };


  const DAYS = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(startOfCurrentWeek, i);
    const dayNames = [t("sun"), t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat")];
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
        const startMinute = start.getMinutes();
        const durationMinutes = (end.getTime() - start.getTime()) / 60000;
        
        let type = "locked";
        if (b.status === "PENDING") {
          type = currentUser && b.user_id === currentUser.id ? "pending" : "locked";
        } else if (b.status === "APPROVED") {
          type = currentUser && b.user_id === currentUser.id ? "approved" : "locked";
        }

        // Only place the slot in the starting hour cell
        if (startHour >= 7 && startHour <= 22) {
          // If there's already a booking, we might need an array, but for now we just assign
          if (!gridBookings[`${dayIdx}-${startHour}`]) {
            gridBookings[`${dayIdx}-${startHour}`] = [];
          }
          gridBookings[`${dayIdx}-${startHour}`].push({
            type,
            title: b.purpose,
            startMinute,
            durationMinutes
          });
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
      
      toast.success(t("booking_success_pending"));
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.message || t("booking_failed");
      toast.error(Array.isArray(msg) ? msg[0] : msg);
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
          className="w-full bg-[#1E5FA5] dark:bg-blue-600 hover:bg-[#154a85] dark:hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-sm dark:shadow-slate-900/50 text-[14px]"
        >
          <Plus className="w-5 h-5" /> {t("book_room_device")}
        </button>

        {/* Filter Box */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm dark:shadow-slate-900/50 border border-[#E0E0E0] dark:border-slate-800 overflow-hidden flex flex-col transition-colors duration-300">
          <div className="p-4 border-b border-[#E0E0E0] dark:border-slate-800 bg-[#F5F5F5] dark:bg-slate-800/50 flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#757575] dark:text-slate-400" />
            <h3 className="text-[14px] font-bold text-[#212121] dark:text-slate-200">{t("search_filter")}</h3>
          </div>
          
          <div className="p-4 overflow-y-auto flex-1 space-y-6">
            
            {/* Lọc theo Phòng */}
            <div className="space-y-3">
              <h4 className="text-[13px] font-bold text-[#212121] dark:text-slate-200 uppercase tracking-wide">{t("lab_room")}</h4>
              <div className="space-y-2">
                {rooms.map((room) => (
                  <label key={room.id} className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={selectedRooms.includes(room.id)}
                      onChange={() => toggleRoom(room.id)}
                      className="w-4 h-4 rounded border-[#E0E0E0] dark:border-slate-700 text-[#1E5FA5] dark:text-blue-400 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50"
                    />
                    <span className="text-[13px] text-[#212121] dark:text-slate-300 group-hover:text-[#1E5FA5] dark:text-blue-400 dark:group-hover:text-blue-400 transition-colors">{room.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm dark:shadow-slate-900/50 border border-[#E0E0E0] dark:border-slate-800 p-4 space-y-3 transition-colors duration-300">
          <h4 className="text-[13px] font-bold text-[#212121] dark:text-slate-200">{t("status_legend")}</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-white dark:bg-slate-900 border border-[#E0E0E0] dark:border-slate-700 rounded-sm"></div>
              <span className="text-[13px] text-[#757575] dark:text-slate-400">{t("status_empty_available")}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-sm flex items-center justify-center"><Lock className="w-3 h-3 text-red-500 dark:text-red-400" /></div>
              <span className="text-[13px] font-bold text-red-500 dark:text-red-400">{t("status_booked_locked")}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-[#FFF8E1] dark:bg-yellow-900/30 border border-[#FFE082] dark:border-yellow-700/50 rounded-sm"></div>
              <span className="text-[13px] text-[#757575] dark:text-slate-400">{t("status_pending_yours")}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-[#D6E4F7] dark:bg-blue-900/30 border border-[#1E5FA5] dark:border-blue-700/50 rounded-sm"></div>
              <span className="text-[13px] text-[#757575] dark:text-slate-400">{t("status_approved_yours")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Calendar Area */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm dark:shadow-slate-900/50 border border-[#E0E0E0] dark:border-slate-800 overflow-hidden flex flex-col min-w-0 relative transition-colors duration-300">
        {isLoading && (
          <div className="absolute inset-0 bg-white dark:bg-slate-900/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <LoadingSpinner size={32} text={t("loading_calendar")} />
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
              className="px-2 py-1.5 text-[13px] font-medium text-[#212121] dark:text-slate-200 bg-white dark:bg-slate-800 border border-[#E0E0E0] dark:border-slate-700 hover:border-[#1E5FA5] rounded transition-colors focus:outline-none focus:ring-1 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50 cursor-pointer cursor-text color-scheme-light dark:color-scheme-dark"
              title={t("choose_any_day")}
            />
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-[13px] font-bold text-[#757575] dark:text-slate-300 bg-white dark:bg-slate-800 border border-[#E0E0E0] dark:border-slate-700 hover:bg-[#F5F5F5] dark:hover:bg-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-700 hover:text-[#212121] dark:text-slate-100 dark:hover:text-white rounded transition-colors"
            >
              Hôm nay
            </button>
            <div className="w-px h-6 bg-[#E0E0E0] dark:bg-slate-700 mx-1"></div>
            <button 
              onClick={() => setCurrentDate(addDays(currentDate, -7))}
              className="p-1.5 text-[#757575] dark:text-slate-400 border border-[#E0E0E0] dark:border-slate-700 hover:bg-[#F5F5F5] dark:hover:bg-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-700 hover:text-[#212121] dark:text-slate-100 dark:hover:text-white rounded transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setCurrentDate(addDays(currentDate, 7))}
              className="p-1.5 text-[#757575] dark:text-slate-400 border border-[#E0E0E0] dark:border-slate-700 hover:bg-[#F5F5F5] dark:hover:bg-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-700 hover:text-[#212121] dark:text-slate-100 dark:hover:text-white rounded transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto bg-[#F5F5F5] dark:bg-slate-950 relative p-4 transition-colors duration-300">
          <div className="min-w-[800px] bg-white dark:bg-slate-900 border border-[#E0E0E0] dark:border-slate-800 rounded-lg overflow-hidden shadow-sm dark:shadow-slate-900/50">
            
            {/* Days Header Row */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[#E0E0E0] dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-800/50">
              <div className="p-3 border-r border-[#E0E0E0] dark:border-slate-800 flex items-center justify-center">
                <Clock className="w-4 h-4 text-[#9E9E9E] dark:text-slate-500" />
              </div>
              {DAYS.map((d, i) => {
                const isToday = isSameDay(d.fullDate, new Date());
                return (
                  <div key={i} className={`p-3 border-r border-[#E0E0E0] dark:border-slate-800 text-center ${isToday ? 'bg-[#D6E4F7] dark:bg-blue-900/30/30 dark:bg-blue-900/20' : ''}`}>
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
                    const slots = getSlot(dayIdx, hour) || [];
                    
                    let cellClasses = "border-b border-r border-[#E0E0E0] dark:border-slate-800 transition-all relative h-[60px] p-0 ";
                    if (dayIdx === 6) cellClasses = cellClasses.replace("border-r", "");

                    return (
                      <div 
                        key={dayIdx} 
                        className={cellClasses + "bg-white dark:bg-slate-900 hover:bg-[#F5F5F5] dark:hover:bg-slate-800 cursor-pointer"} 
                        onClick={() => {
                          setFormData(prev => ({ ...prev, date: format(DAYS[dayIdx].fullDate, "yyyy-MM-dd"), startTime: `${hour.toString().padStart(2, '0')}:00` }));
                          setIsModalOpen(true);
                        }}
                      >
                        {slots.map((slot: any, idx: number) => {
                          let slotClasses = "absolute left-1 right-1 rounded-sm overflow-hidden z-10 shadow-sm ";
                          if (slot.type === "locked") {
                            slotClasses += "bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800/50 cursor-not-allowed text-red-500 dark:text-red-400 flex items-center justify-center flex-col";
                          } else if (slot.type === "pending") {
                            slotClasses += "bg-[#FFF8E1] dark:bg-yellow-900/40 border-l-4 border-l-[#FFC107] dark:border-l-yellow-600 border-t border-r border-b border-[#FFE082] dark:border-yellow-700/50 cursor-pointer p-1";
                          } else if (slot.type === "approved") {
                            slotClasses += "bg-[#D6E4F7] dark:bg-blue-900/40 border-l-4 border-l-[#1E5FA5] dark:border-l-blue-500 border-t border-r border-b border-[#BBDEFB] dark:border-blue-800/50 cursor-pointer p-1";
                          }

                          return (
                            <div 
                              key={idx}
                              className={slotClasses}
                              style={{ 
                                top: `${slot.startMinute}px`, 
                                height: `${slot.durationMinutes}px`,
                                minHeight: '24px' // Ensure it's clickable even if 0 duration
                              }}
                              onClick={(e) => e.stopPropagation()} // Prevent triggering cell click
                            >
                              {slot.type === "locked" ? (
                                <>
                                  <Lock className="w-3 h-3 mb-0.5" />
                                  {slot.durationMinutes >= 30 && <span className="text-[9px] font-bold">{t("booked")}</span>}
                                </>
                              ) : (
                                <>
                                  <div className={`text-[11px] font-bold line-clamp-1 leading-tight ${slot.type === 'pending' ? 'text-[#F57F17] dark:text-yellow-500' : 'text-[#1E5FA5] dark:text-blue-400'}`}>
                                    {slot.title}
                                  </div>
                                  {slot.durationMinutes >= 45 && (
                                    <div className={`text-[9px] mt-0.5 flex items-center gap-1 ${slot.type === 'pending' ? 'text-[#F57F17] dark:text-yellow-600' : 'text-[#1E5FA5] dark:text-blue-500'}`}>
                                      {slot.type === 'pending' ? <><Info className="w-2.5 h-2.5" /> {t("pending_approval")}</> : t("your_schedule")}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
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
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl dark:shadow-slate-900/50 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#E0E0E0] dark:border-slate-800 flex justify-between items-center bg-[#FAFAFA] dark:bg-slate-800/30">
              <h3 className="font-bold text-[#212121] dark:text-slate-100 text-[16px]">{t("book_room_device")}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-[#757575] dark:text-slate-400 hover:bg-[#E0E0E0] dark:hover:bg-slate-700 rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateBooking} className="p-6 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">Mục đích sử dụng <span className="text-red-500">*</span></label>
                <input 
                  required
                  type="text" 
                  value={formData.purpose}
                  onChange={e => setFormData({...formData, purpose: e.target.value})}
                  placeholder={t("ex_purpose")} 
                  className="w-full px-3 py-2 border border-[#E0E0E0] dark:border-slate-800 rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5] dark:focus:border-blue-500 focus:ring-1 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50"
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">Chọn phòng Lab <span className="text-red-500">*</span></label>
                <select 
                  required
                  value={formData.room_id}
                  onChange={e => setFormData({...formData, room_id: e.target.value})}
                  className="w-full px-3 py-2 border border-[#E0E0E0] dark:border-slate-800 rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5] dark:focus:border-blue-500 focus:ring-1 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50"
                  disabled={isSubmitting}
                >
                  <option value="">{t("select_room")}</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({t("capacity")}: {r.capacity})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">Ngày <span className="text-red-500">*</span></label>
                  <input 
                    required
                    type="date" 
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-[#E0E0E0] dark:border-slate-800 rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5] dark:focus:border-blue-500"
                    disabled={isSubmitting}
                    min={format(new Date(), "yyyy-MM-dd")}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">Giờ bắt đầu <span className="text-red-500">*</span></label>
                  <input 
                    required
                    type="time" 
                    value={formData.startTime}
                    onChange={e => setFormData({...formData, startTime: e.target.value})}
                    className="w-full px-3 py-2 border border-[#E0E0E0] dark:border-slate-800 rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5] dark:focus:border-blue-500"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">Thời lượng (Giờ) <span className="text-red-500">*</span></label>
                <select 
                  value={formData.duration}
                  onChange={e => setFormData({...formData, duration: e.target.value})}
                  className="w-full px-3 py-2 border border-[#E0E0E0] dark:border-slate-800 rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5] dark:focus:border-blue-500"
                  disabled={isSubmitting}
                >
                  <option value="1">{t("hour_1")}</option>
                  <option value="2">{t("hour_2")}</option>
                  <option value="3">{t("hour_3")}</option>
                  <option value="4">{t("hour_4")}</option>
                  <option value="5">{t("hour_5")}</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-[#E0E0E0] dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-[14px] font-medium text-[#757575] dark:text-slate-400 hover:bg-[#F5F5F5] dark:hover:bg-slate-800 dark:bg-slate-800/50 rounded-md transition-colors"
                  disabled={isSubmitting}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-[14px] font-bold text-white bg-[#1E5FA5] dark:bg-blue-600 hover:bg-[#154a85] dark:hover:bg-blue-700 rounded-md transition-colors flex items-center gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <LoadingSpinner size={16} className="p-0 text-white" />} 
                  {isSubmitting ? t("processing") : t("confirm_booking")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
