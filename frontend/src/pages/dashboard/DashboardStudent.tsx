import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  ArrowRight,
  LayoutGrid,
  CheckCircle2,
  CalendarPlus,
  Bell,
  MessageSquare,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'react-hot-toast';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { bookingService, roomService, notificationService } from '../../services';
import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { socketService } from '../../services/socket';

import { IBooking, IRoom } from '../../types/models';

interface INotification {
  id: number;
  title: string;
  message: string;
  created_at?: string;
  timestamp?: string;
}

export function DashboardStudent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Lấy thông tin user thật từ localStorage
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const userName = currentUser?.name || t('user_role');
  const userInitial = userName.charAt(0).toUpperCase();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [upcomingBookings, setUpcomingBookings] = useState<IBooking[]>([]);
  const [availableRooms, setAvailableRooms] = useState<IRoom[]>([]);
  const [notifications, setNotifications] = useState<INotification[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [bookingsRes, roomsRes] = await Promise.all([
          bookingService.getAll(),
          roomService.getAll(),
        ]);

        const bookings: IBooking[] = bookingsRes.data || [];
        const rooms: IRoom[] = roomsRes.data || [];

        // Đếm thống kê
        const pending = bookings.filter((b) => b.status === 'PENDING');
        const approved = bookings.filter((b) => b.status === 'APPROVED');

        setPendingCount(pending.length);
        setApprovedCount(approved.length);

        // Lịch sắp tới: PENDING + APPROVED, sắp xếp theo start_time
        const upcoming = bookings
          .filter((b) => b.status === 'PENDING' || b.status === 'APPROVED')
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
          .slice(0, 5);
        setUpcomingBookings(upcoming);

        // Tính toán trạng thái Khả dụng thời gian thực (Dynamic Status)
        const now = new Date().getTime();

        const smartRooms = rooms.map((room) => {
          // Nếu trạng thái tĩnh của phòng không phải AVAILABLE (vd MAINTENANCE, BROKEN) thì giữ nguyên
          if (room.status !== 'AVAILABLE') return room;

          // Lấy tất cả lịch đã duyệt của phòng này trong tương lai gần (hôm nay)
          const roomBookings = approved.filter(b => (b.room?.id === room.id || b.room_id === room.id));

          // Kiểm tra xem phòng có đang bị đặt không
          const isCurrentlyInUse = roomBookings.some((booking) => {
            const start = new Date(booking.start_time).getTime();
            const end = new Date(booking.end_time).getTime();
            return now >= start && now <= end;
          });

          if (isCurrentlyInUse) {
            return { ...room, status: 'IN_USE' };
          }

          // Tính toán thời gian trống (availableUntil)
          // Tìm lịch đặt tiếp theo trong ngày hôm nay
          const endOfDay = new Date();
          endOfDay.setHours(23, 59, 59, 999);
          
          const nextBooking = roomBookings
            .filter(b => {
              const start = new Date(b.start_time).getTime();
              return start > now && start <= endOfDay.getTime();
            })
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];

          return { 
            ...room, 
            status: 'AVAILABLE', 
            availableUntil: nextBooking ? nextBooking.start_time : null 
          };
        });

        // Sắp xếp: AVAILABLE lên đầu, sau đó IN_USE, cuối cùng là MAINTENANCE/BROKEN
        const sortOrder: Record<string, number> = {
          AVAILABLE: 1,
          IN_USE: 2,
          MAINTENANCE: 3,
          BROKEN: 4,
        };
        smartRooms.sort((a, b) => (sortOrder[a.status] || 5) - (sortOrder[b.status] || 5));

        // Lấy 6 phòng đứng đầu danh sách
        setAvailableRooms(smartRooms.slice(0, 6));
      } catch (error: unknown) {
        const err = error as any;
        const msg = err.response?.data?.message || t('load_dashboard_error');
        toast.error(Array.isArray(msg) ? msg[0] : msg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Nạp thông báo cũ từ Database
    const fetchNotifications = async () => {
      try {
        const res = await notificationService.getUnread();
        setNotifications(res.data);
      } catch (err) {
        console.error('Lỗi tải thông báo:', err);
      }
    };
    fetchNotifications();

    // Khởi tạo Socket.io
    const socket = socketService.getSocket();
    if (socket) {
      const handleNotif = (data: INotification) => {
        setNotifications((prev) => [data, ...prev].slice(0, 20));
      };
      const handleRefresh = () => {
        fetchData(); // Lắng nghe sự kiện để tải lại data ngầm
      };

      socket.on('notification', handleNotif);
      socket.on('calendar_updated', handleRefresh);
      socket.on('room_updated', handleRefresh);

      return () => {
        socket.off('notification', handleNotif);
        socket.off('calendar_updated', handleRefresh);
        socket.off('room_updated', handleRefresh);
      };
    }
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications([]);
      toast.success(t('marked_all_read') || 'Đã đánh dấu tất cả là đã đọc');
    } catch (err) {
      console.error(err);
    }
  };

  // Format ngày cho Lịch đặt sắp tới
  const formatBookingDate = (startTime: string) => {
    const date = new Date(startTime);
    if (isToday(date)) return t('today');
    if (isTomorrow(date)) return t('tomorrow');
    return format(date, 'dd/MM/yyyy');
  };

  const formatBookingTime = (startTime: string, endTime: string) => {
    return `${format(new Date(startTime), 'HH:mm')} - ${format(new Date(endTime), 'HH:mm')}`;
  };

  const generateICS = (booking: IBooking) => {
    const startDate = new Date(booking.start_time);
    const endDate = new Date(booking.end_time);

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//LabBook//NONSGML v1.0//EN
BEGIN:VEVENT
UID:${booking.id}-${Date.now()}@labbook.vn
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${t('practice_at')}${booking.room?.name || t('lab_room')}
DESCRIPTION:Lịch thực hành được đặt qua hệ thống LabBook.
LOCATION:${booking.room?.name || t('lab_room')}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lich_thuc_hanh_${booking.id}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t('download_ics_success'));
  };

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Greeting Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 flex justify-between items-center shadow-[0_8px_30px_rgb(0,0,0,0.1)] transition-all duration-300 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none group-hover:bg-white/20 transition-colors duration-500"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none group-hover:bg-purple-400/30 transition-colors duration-500"></div>
        <div className="relative z-10">
          <h1 className="text-[28px] font-extrabold text-white tracking-tight">
            {t('greeting', { name: userName })} 👋
          </h1>
          <p className="text-[15px] font-medium text-blue-100 mt-1.5 opacity-90">{today}</p>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center text-xl font-bold shadow-lg border border-white/30 relative z-10 rotate-3 hover:rotate-0 hover:scale-105 transition-all duration-300">
          {userInitial}
        </div>
      </div>

      {/* BENTO GRID LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* MAIN COLUMN (Left - 8 cols) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Widget
              icon={<Clock className="w-7 h-7 text-orange-500" />}
              bgColor="bg-orange-500"
              label={t('pending_bookings')}
              value={isLoading ? '...' : pendingCount}
              trend={t('processing')}
              trendColor="text-orange-500"
            />
            <Widget
              icon={<CheckCircle2 className="w-7 h-7 text-emerald-500" />}
              bgColor="bg-emerald-500"
              label={t('approved_bookings')}
              value={isLoading ? '...' : approvedCount}
              trend={t('total')}
              trendColor="text-emerald-500"
            />
            <Widget
              icon={<LayoutGrid className="w-7 h-7 text-purple-500" />}
              bgColor="bg-purple-500"
              label={t('available_rooms')}
              value={isLoading ? '...' : availableRooms.filter((r) => r.status === 'AVAILABLE').length}
              trend={t('current')}
              trendColor="text-purple-500"
            />
            <Widget
              icon={<Calendar className="w-7 h-7 text-rose-500" />}
              bgColor="bg-rose-500"
              label={t('upcoming_schedule')}
              value={isLoading ? '...' : upcomingBookings.length}
              trend={t('pending_and_approved')}
              trendColor="text-rose-500"
            />
          </div>

          {/* Lịch đặt sắp tới */}
          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-white/40 dark:border-slate-700/50 p-7 relative overflow-hidden group">
            <div className="absolute -left-20 -top-20 w-64 h-64 bg-blue-400/10 dark:bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div>
                <h2 className="text-xl font-bold text-neutral-800 dark:text-slate-100 flex items-center gap-2 tracking-tight">
                  <Calendar className="w-6 h-6 text-blue-500" /> {t('upcoming_schedule')}
                </h2>
              </div>
              <Link to="/my-bookings" className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1">
                {t('view_all')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="space-y-3 max-h-[280px] overflow-y-auto custom-scrollbar pr-2 relative z-10">
              {isLoading ? (
                <div className="text-center py-8 text-neutral-400">{t('loading')}</div>
              ) : upcomingBookings.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-neutral-200 dark:border-slate-800 rounded-2xl text-neutral-400 dark:text-slate-500 font-medium">
                  {t('no_upcoming_bookings')}
                </div>
              ) : (
                upcomingBookings.map((item) => (
                  <div key={item.id} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-4 rounded-2xl border border-neutral-100 dark:border-slate-700 flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                    <div>
                      <p className="text-[15px] font-bold text-neutral-800 dark:text-slate-200">
                        {item.room?.name || `${t('room_prefix')}#${item.room?.id || '?'}`}
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-medium text-neutral-700 dark:text-slate-300">{formatBookingDate(item.start_time)}</span> • {formatBookingTime(item.start_time, item.end_time)}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg inline-block mb-1.5 ${
                        item.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
                      }`}>
                        {item.status === 'APPROVED' ? t('approved') : t('pending')}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        {item.status === 'APPROVED' && (
                          <button onClick={() => generateICS(item)} className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1.5 rounded-lg transition-colors border border-blue-100 dark:border-blue-900/50 flex items-center gap-1 text-[11px] font-bold" title={t('save_to_calendar')}>
                            <CalendarPlus className="w-3.5 h-3.5" /> {t('save_to_calendar')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Phòng Lab khả dụng */}
          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-white/40 dark:border-slate-700/50 p-7 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h2 className="text-xl font-bold text-neutral-800 dark:text-slate-100 flex items-center gap-2 tracking-tight">
                <LayoutGrid className="w-6 h-6 text-purple-500" /> {t('empty_lab_rooms')}
              </h2>
            </div>
            
            {isLoading ? (
              <div className="text-center py-8 text-neutral-400">{t('loading')}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
                {availableRooms.slice(0, 3).map((lab) => {
                  const isAvailable = lab.status === 'AVAILABLE';
                  return (
                    <div key={lab.id} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-5 rounded-2xl border border-neutral-100 dark:border-slate-700 flex flex-col h-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl flex items-center justify-center">
                          <LayoutGrid className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                          isAvailable ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                        }`}>
                          {isAvailable ? t('empty_upper') : lab.status === 'MAINTENANCE' ? t('maintenance') : t('in_use')}
                        </span>
                      </div>
                      <h3 className="text-[15px] font-bold text-neutral-800 dark:text-slate-200 mb-1 line-clamp-1">{lab.name}</h3>
                      <p className="text-[13px] text-neutral-500 dark:text-slate-400 mb-2">{lab.location || 'VJU Campus'}</p>
                      
                      {isAvailable ? (
                        <p className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 mb-4 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md w-fit">
                          <Clock className="w-3.5 h-3.5" /> 
                          {(lab as any).availableUntil ? t('empty_until', { time: format(new Date((lab as any).availableUntil), 'HH:mm') }) : t('empty_all_day')}
                        </p>
                      ) : (
                        <div className="mb-4 text-[12px] text-transparent select-none px-2 py-1">.</div>
                      )}
                      
                      <div className="mt-auto">
                        <Link to="/calendar" className={`w-full py-2 rounded-xl flex justify-center items-center text-[13px] font-bold transition-all duration-300 ${
                          isAvailable ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20' : 'bg-neutral-100 dark:bg-slate-800 text-neutral-400 cursor-not-allowed pointer-events-none'
                        }`}>
                          {isAvailable ? t('book_now_btn') : t('cannot_book')}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* SIDEBAR COLUMN (Right - 4 cols) */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          
          {/* Quick Actions Panel */}
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => navigate('/borrow-tools')} className="col-span-2 flex items-center justify-center gap-3 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(99,102,241,0.2)] hover:shadow-[0_8px_30px_rgb(99,102,241,0.4)] hover:-translate-y-1 transition-all duration-300 group">
              <div className="bg-white/20 p-2.5 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                <CalendarPlus className="w-6 h-6" />
              </div>
              <span className="font-bold tracking-wide text-lg">{t('borrow_tools')}</span>
            </button>
            
            <button onClick={() => navigate('/community')} className="flex flex-col items-center justify-center gap-2.5 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group">
              <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6 text-blue-500" />
              </div>
              <span className="text-[14px] font-bold text-neutral-700 dark:text-slate-300 text-center">{t('discussion')}</span>
            </button>
            
            <button onClick={() => navigate('/reports', { state: { action: 'create_report' } })} className="flex flex-col items-center justify-center gap-2.5 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group">
              <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <span className="text-[14px] font-bold text-neutral-700 dark:text-slate-300 text-center">{t('tab_incidents')}</span>
            </button>
          </div>

          {/* Activity Feed / Notifications */}
          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40 dark:border-slate-700/50 p-7 relative overflow-hidden group flex-1 flex flex-col h-[500px]">
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div>
                <h2 className="text-lg font-bold text-neutral-800 dark:text-slate-100 flex items-center gap-2 tracking-tight">
                  <Bell className="w-5 h-5 text-amber-500" /> {t('recent_notifications')}
                </h2>
              </div>
              {notifications.length > 0 && (
                <span className="bg-red-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                  {notifications.length}
                </span>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative z-10 space-y-4">
              {notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-neutral-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-neutral-300 dark:text-slate-600" />
                  </div>
                  <p className="text-neutral-500 dark:text-slate-400 font-medium">{t('no_new_notifications')}</p>
                </div>
              ) : (
                <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-neutral-200 dark:before:via-slate-700 before:to-transparent">
                  {notifications.map((item, i) => (
                    <div key={item.id || i} onClick={() => handleMarkAsRead(item.id)} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group cursor-pointer mb-5 last:mb-0">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 bg-blue-100 dark:bg-blue-900/30 text-blue-500">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-neutral-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 duration-300">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                            {t('notifications_upper')}
                          </span>
                          <span className="text-[11px] font-medium text-neutral-400 flex items-center gap-1">
                            <Clock className="w-3 h-3"/> 
                            {formatDistanceToNow(new Date(item.created_at || item.timestamp || Date.now()), { addSuffix: true, locale: vi })}
                          </span>
                        </div>
                        <p className="text-[14px] font-bold text-neutral-800 dark:text-slate-200 mb-1 leading-snug">{item.title}</p>
                        {item.message && <p className="text-[13px] text-neutral-600 dark:text-slate-400 line-clamp-2">{item.message}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {notifications.length > 0 && (
              <div className="pt-4 mt-4 border-t border-neutral-100 dark:border-slate-800 text-center relative z-10">
                <button onClick={handleMarkAllAsRead} className="text-[13px] font-bold text-neutral-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1.5 bg-neutral-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-2 rounded-xl">
                  <CheckCircle2 className="w-4 h-4" /> {t('marked_all_read')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Widget({
  icon,
  bgColor,
  label,
  value,
  trend,
  trendColor,
}: {
  icon: React.ReactNode;
  bgColor: string;
  label: string;
  value: string | number;
  trend: string;
  trendColor: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40 dark:border-slate-700/50 p-6 cursor-pointer transition-all duration-500 relative overflow-hidden group"
    >
      <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full ${bgColor} opacity-10 blur-3xl group-hover:opacity-20 transition-opacity duration-500 pointer-events-none`}></div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 bg-white dark:bg-slate-800 shadow-sm border border-neutral-100 dark:border-slate-700 group-hover:scale-110 transition-transform duration-500`}>
          {icon}
        </div>
        <div className={`px-3 py-1.5 rounded-xl text-[12px] font-bold bg-white dark:bg-slate-800 shadow-sm border border-neutral-100 dark:border-slate-700 ${trendColor}`}>
          {trend}
        </div>
      </div>
      <div className="relative z-10 mt-2">
        <h3 className="text-[13px] font-bold text-neutral-500 dark:text-slate-400 uppercase tracking-widest mb-1">
          {label}
        </h3>
        <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-slate-400 tracking-tighter">
          {value}
        </div>
      </div>
    </motion.div>
  );
}
