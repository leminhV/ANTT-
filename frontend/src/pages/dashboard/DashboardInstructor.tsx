import { useState, useEffect } from 'react';
import { BookOpen, Clock, LayoutGrid, CheckCircle2, ArrowRight, AlertTriangle, FileText, Calendar as CalendarIcon, Check, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'react-hot-toast';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { bookingService, courseService, roomService } from '../../services';
import { IBooking, IRoom, ICourse } from '../../types/models';
import { format, isToday } from 'date-fns';

export function DashboardInstructor() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const userName = currentUser?.name || 'Giảng viên';
  const userInitial = userName.charAt(0).toUpperCase();

  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [coursesCount, setCoursesCount] = useState(0);
  const [pendingBookings, setPendingBookings] = useState<IBooking[]>([]);
  const [todaySchedule, setTodaySchedule] = useState<IBooking[]>([]);
  const [availableRooms, setAvailableRooms] = useState<IRoom[]>([]);


  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [bookingsRes, coursesRes, roomsRes] = await Promise.all([
        bookingService.getAll(),
        courseService.getAll(),
        roomService.getAll(),
      ]);

      const bookings = bookingsRes.data || [];
      const courses = coursesRes.data || [];
      const rooms = roomsRes.data || [];


      // Lọc số lượng khóa học do giảng viên này phụ trách
      const myCourses = courses.filter((c: ICourse) => c.instructor_id === currentUser?.id);
      setCoursesCount(myCourses.length);

      const pending = bookings.filter((b: IBooking) => b.status === 'PENDING');
      const approved = bookings.filter((b: IBooking) => b.status === 'APPROVED');

      setPendingCount(pending.length);
      setApprovedCount(approved.length);

      // Pending approvals for dashboard (Top 5)
      setPendingBookings(
        pending
          .sort((a: IBooking, b: IBooking) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
          .slice(0, 5)
      );

      // Today's schedule
      const todays = approved.filter((b: IBooking) => isToday(new Date(b.start_time)));
      setTodaySchedule(
        todays.sort((a: IBooking, b: IBooking) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      );

      setAvailableRooms(rooms.slice(0, 3));
    } catch (error: unknown) {
      toast.error('Không thể tải dữ liệu Dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser?.id]);

  const handleApprove = async (id: number) => {
    try {
      await bookingService.update(id.toString(), { status: 'APPROVED' });
      toast.success(t('approve_request_success'));
      fetchData(); // Reload data
    } catch (error) {
      toast.error('Có lỗi xảy ra khi duyệt đơn');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await bookingService.update(id.toString(), { status: 'CANCELED' });
      toast.success('Đã từ chối đơn');
      fetchData(); // Reload data
    } catch (error) {
      toast.error('Có lỗi xảy ra khi từ chối đơn');
    }
  };



  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-300 pb-8">
      {/* Greeting Header */}
      <div className="bg-gradient-to-r from-[#1E5FA5] to-[#3B82F6] rounded-2xl p-8 flex justify-between items-center shadow-lg shadow-blue-500/10 transition-all duration-300 relative overflow-hidden group">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3 pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center text-2xl font-bold shadow-xl border border-white/30 hover:bg-white/30 transition-colors cursor-pointer">
            {userInitial}
          </div>
          <div>
            <h1 className="text-[28px] font-bold text-white mb-1 tracking-tight">
              {t('instructor_greeting', { name: userName })}
            </h1>
            <p className="text-[15px] text-blue-100 font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" /> {t('today_is', { date: today })}
            </p>
          </div>
        </div>
        <div className="relative z-10 hidden md:block text-right">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3 inline-block shadow-sm text-white text-sm">
            {t('you_have')} <strong className="text-white text-lg mx-1">{pendingCount}</strong> {t('requests_to_approve')}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<BookOpen className="w-8 h-8 text-indigo-600" />}
          value={isLoading ? '...' : coursesCount}
          label={t('assigned_courses')}
          trend={t('this_semester')}
          trendColor="text-indigo-600"
          color="border-l-indigo-600"
          bgColor="bg-indigo-600"
        />
        <StatCard
          icon={<Clock className="w-8 h-8 text-orange-600" />}
          value={isLoading ? '...' : pendingCount}
          label={t('pending_requests')}
          trend={t('needs_processing')}
          trendColor="text-orange-600"
          color="border-l-orange-600"
          bgColor="bg-orange-600"
        />
        <StatCard
          icon={<CheckCircle2 className="w-8 h-8 text-green-600" />}
          value={isLoading ? '...' : approvedCount}
          label={t('total_bookings')}
          trend={t('confirmed')}
          trendColor="text-green-600"
          color="border-l-green-600"
          bgColor="bg-green-600"
        />
        <StatCard
          icon={<LayoutGrid className="w-8 h-8 text-[#1E5FA5]" />}
          value={isLoading ? '...' : availableRooms.filter((r) => r.status === 'AVAILABLE').length}
          label={t('empty_lab_rooms')}
          trend={t('ready_to_book')}
          trendColor="text-[#1E5FA5]"
          color="border-l-[#1E5FA5]"
          bgColor="bg-[#1E5FA5]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lịch dạy / Ca thực hành hôm nay (MỚI) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-[#E0E0E0] dark:border-slate-800 overflow-hidden flex flex-col transition-all duration-300">
          <div className="px-6 py-5 border-b border-[#E0E0E0] dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
            <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-500" />
              {t('teaching_schedule')}
            </h2>
            <Link
              to="/calendar"
              className="text-[13px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors flex items-center gap-1"
            >
              {t('view_full_schedule')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-[#E0E0E0] dark:divide-slate-800 flex-1 bg-white dark:bg-slate-900">
            {isLoading ? (
              <div className="p-8 text-center text-[#757575] dark:text-slate-400">{t('loading')}</div>
            ) : todaySchedule.length === 0 ? (
              <div className="px-6 py-10 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('no_practice_today')}</h3>
                <p className="text-[13px] text-slate-500">{t('free_time_hint')}</p>
              </div>
            ) : (
              todaySchedule.map((item) => (
                <div key={item.id} className="px-6 py-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex-shrink-0 w-20 text-center">
                    <div className="text-lg font-bold text-slate-800 dark:text-slate-200">{format(new Date(item.start_time), 'HH:mm')}</div>
                    <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{format(new Date(item.start_time), 'a')}</div>
                  </div>
                  <div className="w-1 h-12 bg-indigo-500 rounded-full hidden sm:block"></div>
                  <div className="flex-1">
                    <h3 className="text-[15px] font-bold text-indigo-700 dark:text-indigo-400">
                      {item.room?.name || `${t('room_prefix')}#${item.room?.id || '?'}`}
                    </h3>
                    <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5" /> {item.course?.name || t('free_practice')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions & Báo cáo */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-[#E0E0E0] dark:border-slate-800 p-6">
            <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 mb-4">{t('quick_actions')}</h2>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => navigate('/calendar')} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                <CalendarIcon className="w-5 h-5" />
                <span className="text-[12px] font-medium">{t('book_room')}</span>
              </button>
              <button onClick={() => navigate('/reports', { state: { action: 'create_report' } })} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-[12px] font-medium">{t('report_issue')}</span>
              </button>
              <button onClick={() => navigate('/borrow-tools')} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors">
                <LayoutGrid className="w-5 h-5" />
                <span className="text-[12px] font-medium">{t('borrow_tools')}</span>
              </button>
              <button onClick={() => navigate('/approvals')} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-[12px] font-medium">{t('approve_requests')}</span>
              </button>
            </div>
          </div>

          {/* Cảnh báo sự cố */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-[#E0E0E0] dark:border-slate-800 flex-1 flex flex-col">
            <div className="px-6 py-4 border-b border-[#E0E0E0] dark:border-slate-800">
              <h2 className="text-[15px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                {t('issue_warnings')}
              </h2>
            </div>
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-3">
                <AlertTriangle className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-[13px] text-slate-500 mb-4">{t('no_urgent_issues')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Đơn chờ duyệt trực tiếp */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-[#E0E0E0] dark:border-slate-800 overflow-hidden flex flex-col transition-all duration-300">
        <div className="px-6 py-5 border-b border-[#E0E0E0] dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" />
            {t('recent_pending_requests')}
          </h2>
          <Link
            to="/approvals"
            className="text-[13px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors flex items-center gap-1"
          >
            {t('view_all_requests')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="divide-y divide-[#E0E0E0] dark:divide-slate-800">
          {isLoading ? (
             <div className="p-8 text-center text-[#757575] dark:text-slate-400">{t('loading')}</div>
          ) : pendingBookings.length === 0 ? (
            <div className="px-6 py-12 flex flex-col items-center text-center">
              <img src="https://illustrations.popsy.co/amber/surreal-hourglass.svg" alt="No pending" className="w-32 h-32 mb-4 opacity-80 dark:invert" />
              <p className="text-[14px] text-slate-500 font-medium">{t('no_pending_bookings')}</p>
            </div>
          ) : (
            pendingBookings.map((item) => (
              <div key={item.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center font-bold flex-shrink-0">
                    {item.user?.name ? item.user.name.charAt(0) : 'S'}
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-slate-800 dark:text-slate-200">{item.user?.name || 'Sinh viên'}</h3>
                    <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-0.5">
                      {item.room?.name} - {format(new Date(item.start_time), 'HH:mm dd/MM/yyyy')}
                    </p>
                    {item.purpose && (
                      <p className="text-[12px] text-slate-500 mt-1 italic">"{item.purpose}"</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                  <button onClick={() => handleApprove(item.id)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-[13px] font-bold rounded-lg transition-colors">
                    <Check className="w-4 h-4" /> {t('approve')}
                  </button>
                  <button onClick={() => handleReject(item.id)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[13px] font-bold rounded-lg transition-colors">
                    <X className="w-4 h-4" /> {t('reject')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  trend,
  trendColor,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  trend: string;
  trendColor: string;
  color: string;
  bgColor?: string;
}) {
  const bgHighlightClass = bgColor ? `${bgColor}/10` : color.replace('border-l-', 'bg-') + '/10';
  const blurBgClass = bgColor || color.replace('border-l-', 'bg-');

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-[#E0E0E0] dark:border-slate-800 p-6 cursor-pointer transition-all duration-300 relative overflow-hidden group hover:shadow-lg`}
    >
      <div
        className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${blurBgClass} opacity-[0.08] blur-2xl group-hover:opacity-[0.15] transition-opacity duration-500 pointer-events-none`}
      ></div>
      <div className="flex items-center gap-4 mb-3 relative z-10">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bgHighlightClass} dark:bg-opacity-20 shadow-sm`}
        >
          {icon}
        </div>
        <h3 className="text-[13px] font-semibold text-slate-500 dark:text-slate-400 capitalize">
          {label}
        </h3>
      </div>
      <div className="relative z-10 mt-2">
        <div className="text-[32px] font-black text-slate-800 dark:text-white leading-none">
          {value}
        </div>
        <div className={`text-[13px] font-medium mt-3 ${trendColor}`}>{trend}</div>
      </div>
    </motion.div>
  );
}
