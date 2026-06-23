import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, MonitorPlay, Activity, Check, X, AlertTriangle, Clock, PlusCircle, Wrench, Bell, CalendarClock, ArrowRight, TrendingUp, Zap, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { bookingService, roomService, equipmentService } from '../../services';
import { IBooking, IEquipment } from '../../types/models';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog';

// Màu sắc cho biểu đồ Đơn đặt phòng
const BOOKING_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  APPROVED: '#3B82F6',
  COMPLETED: '#10B981',
  REJECTED: '#EF4444',
  CANCELED: '#9CA3AF',
};

// Màu sắc cho biểu đồ Thiết bị
const EQUIPMENT_COLORS: Record<string, string> = {
  AVAILABLE: '#10B981',
  IN_USE: '#3B82F6',
  MAINTENANCE: '#F59E0B',
  BROKEN: '#EF4444',
};

export function DashboardAdmin() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      PENDING: t('status_pending'),
      APPROVED: t('status_approved'),
      COMPLETED: t('status_completed'),
      REJECTED: t('status_rejected'),
      CANCELED: t('status_canceled'),
      AVAILABLE: t('status_available'),
      IN_USE: t('status_in_use'),
      MAINTENANCE: t('status_maintenance'),
      BROKEN: t('status_broken'),
    };
    return map[status] || status;
  };

  const [stats, setStats] = useState({
    pendingRequests: 0,
    devicesTotal: 0,
    roomsTotal: 0,
  });
  const [recentBookings, setRecentBookings] = useState<IBooking[]>([]);
  const [bookingChartData, setBookingChartData] = useState<
    { name: string; value: number; color: string }[]
  >([]);
  const [equipmentChartData, setEquipmentChartData] = useState<
    { name: string; value: number; color: string }[]
  >([]);
  const [alerts, setAlerts] = useState<{ id: string, type: 'BROKEN' | 'OVERDUE' | 'NO_SHOW', message: string, time?: string }[]>([]);
  const [todayBookings, setTodayBookings] = useState<IBooking[]>([]);
  const [usageTrendsData, setUsageTrendsData] = useState<{ date: string; bookings: number }[]>([]);
  const [activityFeed, setActivityFeed] = useState<{ id: string, type: 'BOOKING_CREATED' | 'BOOKING_APPROVED' | 'EQUIPMENT_BROKEN', message: string, time: Date, color: string, bgColor: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [bookingsRes, roomsRes, equipmentRes] = await Promise.all([
          bookingService.getAll(),
          roomService.getAll(),
          equipmentService.getAll(),
        ]);

        const bookings = bookingsRes.data || [];
        const rooms = roomsRes.data || [];
        const equipment = equipmentRes.data || [];

        const pending = bookings.filter((b: IBooking) => b.status === 'PENDING');

        setStats({
          pendingRequests: pending.length,
          roomsTotal: rooms.length,
          devicesTotal: equipment.length,
        });

        // Get 5 most recent pending bookings
        setRecentBookings(pending.slice(0, 5));

        // --- Build Booking Chart Data ---
        const bookingStatusCounts: Record<string, number> = {};
        bookings.forEach((b: IBooking) => {
          bookingStatusCounts[b.status] = (bookingStatusCounts[b.status] || 0) + 1;
        });
        const bookingData = Object.entries(bookingStatusCounts)
          .filter(([, count]) => count > 0)
          .map(([status, count]) => ({
            name: getStatusLabel(status) || status,
            value: count,
            color: BOOKING_COLORS[status] || '#9CA3AF',
          }));
        setBookingChartData(bookingData);

        // --- Build Equipment Chart Data ---
        const equipStatusCounts: Record<string, number> = {};
        equipment.forEach((e: IEquipment) => {
          equipStatusCounts[e.status] = (equipStatusCounts[e.status] || 0) + 1;
        });
        const equipData = Object.entries(equipStatusCounts)
          .filter(([, count]) => count > 0)
          .map(([status, count]) => ({
            name: getStatusLabel(status) || status,
            value: count,
            color: EQUIPMENT_COLORS[status] || '#9CA3AF',
          }));
        setEquipmentChartData(equipData);

        // --- Calculate Alerts ---
        const newAlerts: any[] = [];
        equipment.filter((e: IEquipment) => e.status === 'BROKEN').forEach((e: IEquipment) => {
          newAlerts.push({ id: `eq-${e.id}`, type: 'BROKEN', message: t('equipment_broken_alert', { name: e.name }) });
        });
        
        const now = new Date();
        bookings.filter((b: IBooking) => (b.status === 'APPROVED' || b.status === 'IN_USE') && new Date(b.end_time) < now)
        .forEach((b: IBooking) => {
          newAlerts.push({ id: `bk-${b.id}`, type: 'OVERDUE', message: t('booking_overdue_alert', { room: b.room?.name || t('no_room'), user: b.user?.name || '' }), time: b.end_time });
        });
        setAlerts(newAlerts);

        // --- Calculate Today's Bookings ---
        const todays = bookings.filter((b: IBooking) => 
          new Date(b.start_time).toDateString() === now.toDateString() && 
          ['APPROVED', 'IN_USE', 'COMPLETED'].includes(b.status)
        ).sort((a: IBooking, b: IBooking) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        setTodayBookings(todays);

        // --- Calculate Usage Trends (Last 7 Days) ---
        const trendsData = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dateStr = format(d, 'dd/MM');
          // count bookings created on this day
          const count = bookings.filter((b: IBooking) => b.created_at && new Date(b.created_at).toDateString() === d.toDateString()).length;
          trendsData.push({ date: dateStr, bookings: count });
        }
        setUsageTrendsData(trendsData);

        // --- Calculate Activity Feed (Mocked from recent bookings & equipment) ---
        const feed: any[] = [];
        bookings.slice(0, 15).forEach((b: IBooking) => {
          if (b.status === 'PENDING') {
            feed.push({ id: `feed-bk-p-${b.id}`, type: 'BOOKING_CREATED', message: t('booking_created_feed', { user: b.user?.name || t('someone', 'Ai đó'), room: b.room?.name || b.room_id }), time: new Date(b.created_at || now), color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/30' });
          } else if (b.status === 'APPROVED' || b.status === 'IN_USE') {
            feed.push({ id: `feed-bk-a-${b.id}`, type: 'BOOKING_APPROVED', message: t('booking_approved_feed', { room: b.room?.name || b.room_id }), time: new Date(b.updated_at || b.created_at || now), color: 'text-emerald-500', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' });
          }
        });
        equipment.filter((e: IEquipment) => e.status === 'BROKEN').forEach((e: IEquipment) => {
           feed.push({ id: `feed-eq-b-${e.id}`, type: 'EQUIPMENT_BROKEN', message: t('equipment_broken_feed', { name: e.name }), time: new Date(e.updated_at || now), color: 'text-red-500', bgColor: 'bg-red-100 dark:bg-red-900/30' });
        });
        feed.sort((a, b) => b.time.getTime() - a.time.getTime());
        setActivityFeed(feed.slice(0, 6));

      } catch (error: unknown) {
        const err = error as any;
        const msg = err.response?.data?.message || t('dashboard_load_error');
        toast.error(Array.isArray(msg) ? msg[0] : msg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      await bookingService.update(id.toString(), { status: 'APPROVED' });
      setRecentBookings(recentBookings.filter((b) => b.id !== id));
      setStats((prev) => ({ ...prev, pendingRequests: prev.pendingRequests - 1 }));
    } catch (error: unknown) {
      const err = error as any;
      const msg = err.response?.data?.message || t('approve_failed');
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  const handleReject = async (id: number) => {
    try {
      await bookingService.update(id.toString(), { status: 'REJECTED' });
      setRecentBookings(recentBookings.filter((b) => b.id !== id));
      setStats((prev) => ({ ...prev, pendingRequests: prev.pendingRequests - 1 }));
    } catch (error: unknown) {
      const err = error as any;
      const msg = err.response?.data?.message || t('reject_failed');
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-neutral-900 to-neutral-500 dark:from-white dark:to-slate-400 tracking-tight">
          {t('dashboard_title')}
        </h1>
        <p className="text-neutral-500 dark:text-slate-400 mt-2 font-medium">{t('dashboard_desc')}</p>
      </div>

      {/* ── BENTO GRID LAYOUT ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* ── MAIN COLUMN (Left - 8 cols) ── */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Widget
              icon={<Activity className="w-7 h-7 text-orange-500" />}
              bgColor="bg-orange-500"
              label={t('pending_requests')}
              value={isLoading ? '...' : stats.pendingRequests}
              trend={t('needs_action')}
              trendColor="text-orange-500"
            />
            <Widget
              icon={<MonitorPlay className="w-7 h-7 text-blue-500" />}
              bgColor="bg-blue-500"
              label={t('total_devices')}
              value={isLoading ? '...' : stats.devicesTotal}
              trend={t('managing')}
              trendColor="text-blue-500"
            />
            <Widget
              icon={<Users className="w-7 h-7 text-emerald-500" />}
              bgColor="bg-emerald-500"
              label={t('total_rooms')}
              value={isLoading ? '...' : stats.roomsTotal}
              trend={t('active')}
              trendColor="text-emerald-500"
            />
          </div>

          {/* Usage & Actions Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Today's Usage Panel (Spans 2 cols) */}
            <div className="lg:col-span-2 bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-white/40 dark:border-slate-700/50 p-7 relative overflow-hidden group">
              <div className="absolute -left-20 -top-20 w-64 h-64 bg-blue-400/10 dark:bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div>
                  <h2 className="text-xl font-bold text-neutral-800 dark:text-slate-100 flex items-center gap-2 tracking-tight">
                    <CalendarClock className="w-6 h-6 text-blue-500" /> {t('today_usage')}
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">{t('ongoing_upcoming_schedule')}</p>
                </div>
                <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-sm font-bold px-3 py-1.5 rounded-xl">{t('sessions_count', { count: todayBookings.length })}</span>
              </div>
              
              <div className="space-y-3 max-h-[280px] overflow-y-auto custom-scrollbar pr-2 relative z-10">
                {isLoading ? (
                  <div className="text-center py-8 text-neutral-400">{t('loading')}</div>
                ) : todayBookings.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-neutral-200 dark:border-slate-800 rounded-2xl text-neutral-400 dark:text-slate-500">
                    {t('no_schedule_today')}
                  </div>
                ) : (
                  todayBookings.map(b => (
                    <div key={b.id} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-4 rounded-2xl border border-neutral-100 dark:border-slate-700 flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                      <div>
                        <p className="text-[15px] font-bold text-neutral-800 dark:text-slate-200">
                          {b.room?.name || `${t('room_prefix')} ${b.room_id}`}
                        </p>
                        <p className="text-sm text-neutral-500 dark:text-slate-400 mt-0.5">
                          <span className="font-medium text-neutral-700 dark:text-slate-300">{b.user?.name}</span> • {b.purpose}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg inline-block mb-1.5 ${
                          b.status === 'IN_USE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' :
                          b.status === 'APPROVED' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        }`}>
                          {getStatusLabel(b.status)}
                        </span>
                        <p className="text-[13px] font-bold text-neutral-600 dark:text-slate-300 font-mono bg-neutral-50 dark:bg-slate-900 px-2 py-1 rounded-md border border-neutral-100 dark:border-slate-700">
                          {format(new Date(b.start_time), 'HH:mm')} - {format(new Date(b.end_time), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions Panel (1 col) */}
            <div className="flex flex-col gap-4">
              <button onClick={() => navigate('/users', { state: { action: 'create_user' } })} className="flex-1 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-3xl p-6 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-1 transition-all duration-300 group">
                <div className="bg-white/20 p-3 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <PlusCircle className="w-8 h-8" />
                </div>
                <span className="font-bold tracking-wide">{t('create_user')}</span>
              </button>
              
              <div className="flex-1 grid grid-cols-2 gap-4">
                <button onClick={() => navigate('/reports', { state: { action: 'create_report' } })} className="flex flex-col items-center justify-center gap-2 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 rounded-3xl p-4 shadow-sm hover:shadow-md transition-all group">
                  <Wrench className="w-6 h-6 text-red-500 group-hover:-rotate-12 transition-transform" />
                  <span className="text-[13px] font-semibold text-neutral-700 dark:text-slate-300 text-center">{t('report_issue')}</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-2 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 rounded-3xl p-4 shadow-sm hover:shadow-md transition-all group">
                  <Bell className="w-6 h-6 text-amber-500 group-hover:rotate-12 transition-transform" />
                  <span className="text-[13px] font-semibold text-neutral-700 dark:text-slate-300 text-center">{t('notifications')}</span>
                </button>
              </div>
            </div>
            
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Booking Status Chart */}
            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40 dark:border-slate-700/50 p-7 hover:shadow-lg transition-all duration-500 relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 w-32 h-32 bg-blue-400/10 rounded-tl-full blur-2xl pointer-events-none"></div>
              <h2 className="text-lg font-bold text-neutral-800 dark:text-slate-100 mb-1 tracking-tight">{t('booking_status_ratio')}</h2>
              <p className="text-sm text-neutral-500 dark:text-slate-400 mb-6">{t('booking_status_desc')}</p>
              
              {isLoading ? (
                <div className="h-56 flex items-center justify-center text-neutral-400">{t('loading')}</div>
              ) : bookingChartData.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-neutral-400">{t('no_data')}</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={bookingChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                      {bookingChartData.map((entry, index) => (
                        <Cell key={`bk-cell-${index}`} fill={entry.color} className="drop-shadow-sm hover:opacity-80 transition-opacity" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 500 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Equipment Status Chart */}
            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40 dark:border-slate-700/50 p-7 hover:shadow-lg transition-all duration-500 relative overflow-hidden group">
              <div className="absolute right-0 bottom-0 w-32 h-32 bg-emerald-400/10 rounded-tl-full blur-2xl pointer-events-none"></div>
              <h2 className="text-lg font-bold text-neutral-800 dark:text-slate-100 mb-1 tracking-tight">{t('equipment_status_ratio')}</h2>
              <p className="text-sm text-neutral-500 dark:text-slate-400 mb-6">{t('equipment_status_desc')}</p>
              
              {isLoading ? (
                <div className="h-56 flex items-center justify-center text-neutral-400">{t('loading')}</div>
              ) : equipmentChartData.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-neutral-400">{t('no_data')}</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={equipmentChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                      {equipmentChartData.map((entry, index) => (
                        <Cell key={`eq-cell-${index}`} fill={entry.color} className="drop-shadow-sm hover:opacity-80 transition-opacity" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 500 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Usage Trends Chart */}
          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40 dark:border-slate-700/50 p-7 hover:shadow-lg transition-all duration-500 relative overflow-hidden group">
            <div className="absolute right-0 bottom-0 w-48 h-48 bg-purple-400/10 rounded-tl-full blur-3xl pointer-events-none"></div>
            <div className="flex items-center gap-2 mb-1 relative z-10">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-bold text-neutral-800 dark:text-slate-100 tracking-tight">{t('usage_trend_7_days')}</h2>
            </div>
            <p className="text-sm text-neutral-500 dark:text-slate-400 mb-6 relative z-10">{t('new_booking_stats')}</p>
            
            {isLoading ? (
              <div className="h-64 flex items-center justify-center text-neutral-400">{t('loading')}</div>
            ) : usageTrendsData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-neutral-400">{t('no_data')}</div>
            ) : (
              <div className="h-64 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={usageTrendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.5} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                      itemStyle={{ color: '#1F2937', fontWeight: 600 }}
                    />
                    <Area type="monotone" dataKey="bookings" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorBookings)" activeDot={{ r: 6, strokeWidth: 0, fill: '#8B5CF6' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          
        </div>

        {/* ── SIDEBAR COLUMN (Right - 4 cols) ── */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          
          {/* Hero Alerts Panel */}
          <div className="bg-red-50/80 dark:bg-red-900/20 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(239,68,68,0.1)] border-2 border-red-200/50 dark:border-red-800/50 p-7 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 via-orange-400 to-red-400 animate-pulse"></div>
            <div className="absolute -right-20 -bottom-20 w-48 h-48 bg-red-400/20 rounded-full blur-3xl pointer-events-none group-hover:bg-red-400/30 transition-colors duration-500"></div>
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div>
                <h2 className="text-xl font-extrabold text-red-700 dark:text-red-400 flex items-center gap-2 tracking-tight">
                  <AlertTriangle className="w-6 h-6" /> {t('urgent_alerts')}
                </h2>
                <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1 font-medium">{t('needs_admin_attention')}</p>
              </div>
              <span className="bg-red-600 text-white text-sm font-black px-3 py-1 rounded-xl shadow-sm">{alerts.length}</span>
            </div>
            
            <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 relative z-10">
              {isLoading ? (
                <div className="text-center py-8 text-red-400 font-medium">{t('system_scanning')}</div>
              ) : alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-red-500/70 dark:text-red-400/70 bg-white/40 dark:bg-red-950/20 rounded-2xl border border-red-100/50 dark:border-red-900/30">
                  <Check className="w-10 h-10 mb-2 opacity-50" />
                  <p className="font-medium">{t('everything_working_fine')}</p>
                </div>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id} className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-red-100 dark:border-red-900/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 bg-red-100 dark:bg-red-900/50 p-2.5 rounded-xl text-red-600 dark:text-red-400 shadow-inner">
                        {alert.type === 'BROKEN' ? <Wrench className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-[14px] font-bold text-neutral-800 dark:text-slate-200 leading-snug">{alert.message}</p>
                        {alert.time && <p className="text-[12px] font-semibold text-red-500 mt-1.5 flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md w-fit border border-red-100/50 dark:border-red-800/30"><Clock className="w-3.5 h-3.5" /> {t('overdue')}{format(new Date(alert.time), 'HH:mm dd/MM')}</p>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Pending Bookings */}
          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40 dark:border-slate-700/50 p-7 flex-1 flex flex-col relative overflow-hidden group">
            <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-400/20 transition-colors duration-500"></div>
            
            <div className="flex justify-between items-end mb-6 relative z-10">
              <div>
                <h2 className="text-xl font-bold text-neutral-800 dark:text-slate-100 tracking-tight">{t('pending_approval', 'Chờ phê duyệt')}</h2>
                <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1 font-medium">{t('latest_pending_requests')}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative z-10">
              <div className="space-y-4">
                {isLoading ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : recentBookings.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-neutral-200 dark:border-slate-800 rounded-2xl text-neutral-400 dark:text-slate-500 font-medium">
                    {t('no_pending_bookings_admin')}
                  </div>
                ) : (
                  recentBookings.map((req, i) => (
                    <div key={i} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-neutral-100 dark:border-slate-700 p-5 rounded-2xl hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-[15px] text-neutral-800 dark:text-slate-200">{req.room?.name || `${t('room_prefix', 'Phòng')} ${req.room_id}`}</h3>
                          <p className="text-[13px] font-medium text-neutral-600 dark:text-slate-400 mt-0.5">{req.user?.name}</p>
                        </div>
                        <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[11px] font-bold px-2.5 py-1 rounded-lg">PENDING</span>
                      </div>
                      
                      <div className="bg-neutral-50 dark:bg-slate-900/50 rounded-xl p-3 mb-4 border border-neutral-100 dark:border-slate-800">
                        <p className="text-[13px] font-mono text-neutral-700 dark:text-slate-300 font-semibold flex items-center justify-center gap-2">
                          <Clock className="w-4 h-4 text-neutral-400" />
                          {req.start_time ? format(new Date(req.start_time), 'dd/MM, HH:mm') : ''} 
                          <ArrowRight className="w-3 h-3 text-neutral-400" /> 
                          {req.end_time ? format(new Date(req.end_time), 'HH:mm') : ''}
                        </p>
                      </div>
                      
                      <div className="flex gap-3">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-xl transition-colors">
                              <X className="w-4 h-4" /> {t('reject')}
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-neutral-200 dark:border-slate-800 rounded-3xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl font-bold">{t('confirm_reject')}</AlertDialogTitle>
                              <AlertDialogDescription>{t('confirm_reject_msg')}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-6">
                              <AlertDialogCancel className="rounded-xl font-medium">{t('cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleReject(req.id)} className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold">{t('confirm_reject_btn')}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        
                        <button onClick={() => handleApprove(req.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-0.5 rounded-xl transition-all">
                          <Check className="w-4 h-4" /> {t('approve')}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          {/* Activity Feed Panel */}
          <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40 dark:border-slate-700/50 p-7 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div>
                <h2 className="text-lg font-bold text-neutral-800 dark:text-slate-100 flex items-center gap-2 tracking-tight">
                  <Zap className="w-5 h-5 text-amber-500 fill-amber-500/20" /> {t('recent_activity')}
                </h2>
                <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">{t('realtime_update')}</p>
              </div>
            </div>
            
            <div className="space-y-4 relative z-10">
              {isLoading ? (
                <div className="text-center py-6 text-neutral-400">{t('loading')}</div>
              ) : activityFeed.length === 0 ? (
                <div className="text-center py-8 text-neutral-400 border-2 border-dashed border-neutral-200 dark:border-slate-800 rounded-2xl">{t('no_recent_activity')}</div>
              ) : (
                <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-700 before:to-transparent">
                  {activityFeed.map((item) => (
                    <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-5 last:mb-0">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${item.bgColor} ${item.color}`}>
                        {item.type === 'BOOKING_CREATED' && <FileText className="w-4 h-4" />}
                        {item.type === 'BOOKING_APPROVED' && <Check className="w-4 h-4" />}
                        {item.type === 'EQUIPMENT_BROKEN' && <Wrench className="w-4 h-4" />}
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-neutral-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow hover:-translate-y-0.5 duration-300">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${item.bgColor} ${item.color}`}>
                            {item.type === 'BOOKING_CREATED' ? t('new_upper') : item.type === 'BOOKING_APPROVED' ? t('approved_upper') : t('incident_upper')}
                          </span>
                          <span className="text-[11px] font-medium text-neutral-400 flex items-center gap-1"><Clock className="w-3 h-3"/> {format(item.time, 'HH:mm')}</span>
                        </div>
                        <p className="text-[13px] text-neutral-700 dark:text-slate-300 font-medium leading-snug">{item.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

// ── Skeleton shimmer components ──
function SkeletonCard() {
  return (
    <div className="bg-white/50 dark:bg-slate-800/50 p-5 rounded-2xl border border-neutral-100 dark:border-slate-800 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24"></div>
          <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-32"></div>
        </div>
        <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-16"></div>
      </div>
      <div className="h-10 bg-gray-100 dark:bg-slate-900/50 rounded-xl w-full mb-4"></div>
      <div className="flex gap-3">
        <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded-xl flex-1"></div>
        <div className="h-10 bg-gray-300 dark:bg-slate-600 rounded-xl flex-1"></div>
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
