import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, XCircle, FileText, CalendarX, QrCode, X, CalendarPlus, Clock, MapPin, Package, AlertCircle, ChevronRight, Star } from 'lucide-react';
import { bookingService, checkInService } from '../../services';
import apiClient from '../../services/apiClient';
import { format } from 'date-fns';

import { toast } from 'react-hot-toast';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { useNavigate } from 'react-router';
import { IBooking } from '../../types/models';

export function MyBookings() {
  const { t } = useTranslation();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [bookings, setBookings] = useState<IBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelConfirmId, setCancelConfirmId] = useState<number | null>(null);
  const [scanBooking, setScanBooking] = useState<IBooking | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<IBooking | null>(null);
  const [ratingBooking, setRatingBooking] = useState<IBooking | null>(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await bookingService.getMyBookings();
      setBookings(res.data || []);
    } catch (error: unknown) {
      const err = error as any;
      const msg = err.response?.data?.message || t('load_bookings_error');
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRating = async () => {
    if (!ratingBooking) return;
    try {
      await apiClient.post('/api/ratings', {
        room_id: ratingBooking.room_id,
        equipment_id: ratingBooking.equipment_id,
        score: ratingScore,
        comment: ratingComment,
      });
      toast.success('Cảm ơn bạn đã đánh giá!');
      setRatingBooking(null);
      setRatingScore(5);
      setRatingComment('');
    } catch (error) {
      toast.error('Lỗi khi gửi đánh giá');
    }
  };

  const executeCancel = async () => {
    if (cancelConfirmId) {
      try {
        await bookingService.cancel(cancelConfirmId.toString());
        toast.success(t('cancel_success'));
        fetchData();
      } catch (error: unknown) {
        const err = error as any;
        const msg = err.response?.data?.message || t('cancel_failed');
        toast.error(Array.isArray(msg) ? msg[0] : msg);
      }
      setCancelConfirmId(null);
    }
  };

  const handleScanQR = (booking: IBooking) => {
    setScanBooking(booking);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: t('status_pending'),
      APPROVED: t('status_approved'),
      REJECTED: t('status_rejected'),
      CANCELED: t('status_canceled'),
      IN_USE: 'Đang sử dụng',
      COMPLETED: 'Hoàn thành',
    };

    switch (status) {
      case 'PENDING':
        return (
          <span className="px-3 py-1 bg-amber-100/80 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-full text-[12px] font-bold shadow-sm border border-amber-200/50 backdrop-blur-sm">
            {map['PENDING']}
          </span>
        );
      case 'APPROVED':
        return (
          <span className="px-3 py-1 bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-full text-[12px] font-bold shadow-sm border border-emerald-200/50 backdrop-blur-sm">
            {map['APPROVED']}
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-3 py-1 bg-rose-100/80 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 rounded-full text-[12px] font-bold shadow-sm border border-rose-200/50 backdrop-blur-sm">
            {map['REJECTED']}
          </span>
        );
      case 'CANCELED':
        return (
          <span className="px-3 py-1 bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 rounded-full text-[12px] font-bold shadow-sm border border-slate-200/50 backdrop-blur-sm">
            {map['CANCELED']}
          </span>
        );
      case 'IN_USE':
        return (
          <span className="px-3 py-1 bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-full text-[12px] font-bold shadow-sm border border-blue-200/50 backdrop-blur-sm animate-pulse">
            {map['IN_USE']}
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-3 py-1 bg-teal-100/80 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 rounded-full text-[12px] font-bold shadow-sm border border-teal-200/50 backdrop-blur-sm">
            {map['COMPLETED']}
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 rounded-full text-[12px] font-bold shadow-sm border border-slate-200/50 backdrop-blur-sm">
            {status}
          </span>
        );
    }
  };

  const exportToICS = (e: React.MouseEvent, booking: IBooking) => {
    e.stopPropagation();
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };
    const start = formatDate(new Date(booking.start_time));
    const end = formatDate(new Date(booking.end_time));
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${start}
DTEND:${end}
SUMMARY:LabBook - ${booking.room?.name || 'Phòng Lab'}
DESCRIPTION:Mục đích: ${booking.purpose}\\nTrạng thái: ${booking.status}
LOCATION:${booking.room?.name || 'VJU Lab'}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `booking-${booking.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Đã xuất file lịch (.ics)');
  };

  const filteredBookings = bookings.filter((b) => {
    const matchSearch = b.id.toString().includes(searchTerm) || (b.room?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    let matchTab = true;
    if (activeTab === 'PENDING') matchTab = b.status === 'PENDING';
    else if (activeTab === 'UPCOMING') matchTab = ['APPROVED', 'IN_USE'].includes(b.status);
    else if (activeTab === 'HISTORY') matchTab = ['COMPLETED', 'CANCELED', 'REJECTED'].includes(b.status);
    return matchSearch && matchTab;
  });

  return (
    <div className="max-w-[1200px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-700 dark:from-blue-400 dark:to-indigo-400 tracking-tight">
            {t('my_bookings')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Quản lý và theo dõi trạng thái các đơn đặt lịch của bạn
          </p>
        </div>

        <div className="relative w-full md:w-[320px] group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            placeholder={t('search_booking_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl text-[14px] shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-slate-300 dark:hover:border-slate-700"
          />
        </div>
      </div>

      {/* Segmented Controls Tabs */}
      <div className="inline-flex p-1.5 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md rounded-2xl w-full md:w-auto overflow-x-auto hide-scrollbar border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
        {[
          { id: 'ALL', label: 'Tất cả' },
          { id: 'UPCOMING', label: 'Sắp diễn ra' },
          { id: 'PENDING', label: 'Chờ duyệt' },
          { id: 'HISTORY', label: 'Lịch sử' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-6 py-2.5 rounded-xl text-[14px] font-bold transition-all duration-300 ease-out ${
              activeTab === tab.id 
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-md transform scale-[1.02]' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area - Scrollable Container */}
      <div className="bg-white/40 dark:bg-slate-800/20 backdrop-blur-md rounded-3xl border border-white/50 dark:border-slate-700/50 p-6 md:p-8 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 h-[calc(100vh-280px)] min-h-[500px] overflow-y-auto custom-scrollbar">
        {/* Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBookings.map((bk) => (
              <div
                key={bk.id}
                onClick={() => setSelectedBooking(bk)}
                className="group relative bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
              >
                {/* Card Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center border border-blue-100 dark:border-blue-800">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider block">Mã Đơn</span>
                      <span className="text-[15px] font-extrabold text-slate-800 dark:text-slate-100">#{bk.id}</span>
                    </div>
                  </div>
                  {getStatusBadge(bk.status)}
                </div>

                {/* Card Body */}
                <div className="space-y-4 flex-1">
                  <div>
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-[13px] font-semibold">Phòng/Khu vực</span>
                    </div>
                    <p className="text-[15px] font-bold text-slate-900 dark:text-white line-clamp-1">
                      {bk.room?.name || 'Không xác định'}
                    </p>
                    <div className="mt-2">
                      {bk.equipment_id || (bk.chemical_usages && bk.chemical_usages.length > 0) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50">
                          <Package className="w-3 h-3" /> Mượn Dụng Cụ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50">
                          Đặt Không Gian
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300">Thời gian</span>
                    </div>
                    <div className="text-[14px] font-medium text-slate-900 dark:text-white">
                      {format(new Date(bk.start_time), 'HH:mm')} - {format(new Date(bk.end_time), 'HH:mm')}
                    </div>
                    <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {format(new Date(bk.start_time), 'dd/MM/yyyy')}
                    </div>
                  </div>
                </div>

                {/* Card Footer / Actions */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => exportToICS(e, bk)}
                      title="Thêm vào lịch cá nhân"
                      className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                    >
                      <CalendarPlus className="w-4 h-4" />
                    </button>
                    
                    {bk.status === 'PENDING' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setCancelConfirmId(bk.id); }}
                        title="Hủy đơn"
                        className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {bk.status === 'APPROVED' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleScanQR(bk); }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl text-[13px] font-bold transition-colors"
                      >
                        <QrCode className="w-4 h-4" /> Check-in
                      </button>
                    )}
                    {bk.status === 'IN_USE' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleScanQR(bk); }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 hover:bg-orange-600 hover:text-white rounded-xl text-[13px] font-bold transition-colors"
                      >
                        <QrCode className="w-4 h-4" /> Check-out
                      </button>
                    )}
                    {bk.status === 'COMPLETED' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setRatingBooking(bk); }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 hover:bg-yellow-500 hover:text-white rounded-xl text-[13px] font-bold transition-colors"
                      >
                        <Star className="w-4 h-4" /> Đánh giá
                      </button>
                    )}
                    {['COMPLETED', 'CANCELED', 'REJECTED', 'PENDING'].includes(bk.status) && (
                      <div className="flex items-center text-[13px] font-bold text-slate-400 group-hover:text-blue-600 transition-colors">
                        Chi tiết <ChevronRight className="w-4 h-4 ml-0.5" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-24 flex flex-col items-center justify-center max-w-sm mx-auto space-y-4">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center mb-2 shadow-inner border border-blue-100">
              <CalendarX className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
              {t('no_bookings_yet')}
            </h3>
            <p className="text-[14px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
              Bạn chưa có đơn đặt lịch nào trong mục này. Hãy tạo mới một đơn đặt lịch để sử dụng tài nguyên của phòng Lab.
            </p>
            <button
              onClick={() => navigate('/calendar')}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-[14px] font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all duration-300"
            >
              Đặt lịch ngay
            </button>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={cancelConfirmId !== null}
        title={t('confirm_cancel_booking')}
        message={t('confirm_cancel_booking_msg')}
        confirmText={t('cancel_booking_btn')}
        isDestructive={true}
        onConfirm={executeCancel}
        onCancel={() => setCancelConfirmId(null)}
      />

      {/* Scanner Mock Modal */}
      {scanBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/20 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-sm">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-[16px] flex items-center gap-2">
                <QrCode className="w-5 h-5 text-blue-600" />
                {scanBooking.status === 'APPROVED' ? 'Giả lập Check-in' : 'Giả lập Check-out'}
              </h3>
              <button
                onClick={() => setScanBooking(null)}
                className="p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-600 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center space-y-6">
              <div className="bg-blue-50/50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                <p className="text-[13px] text-blue-800 dark:text-blue-300 text-center leading-relaxed font-medium">
                  Vui lòng hướng camera điện thoại về phía mã QR dán trên cửa phòng <strong className="text-blue-900 dark:text-blue-100">{scanBooking.room?.name}</strong>
                  {scanBooking.equipment && ` hoặc trên thiết bị ${scanBooking.equipment.name}`}.
                </p>
              </div>

              {/* Mock Scanner View Finder */}
              <div className="relative w-56 h-56 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-slate-800 shadow-inner group">
                <div
                  className="absolute left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_15px_#3b82f6] animate-bounce w-full z-10"
                  style={{ animationDuration: '2s' }}
                ></div>

                <div className="text-slate-500 flex flex-col items-center space-y-3 z-20">
                  <div className="w-20 h-20 border-2 border-slate-700 rounded-xl p-1.5 flex flex-wrap gap-1 justify-center items-center">
                    <div className="w-6 h-6 bg-slate-800 rounded-sm"></div>
                    <div className="w-6 h-6 bg-slate-800 rounded-sm"></div>
                    <div className="w-6 h-6 bg-slate-800 rounded-sm"></div>
                    <div className="w-6 h-6 border-2 border-slate-800 rounded-sm"></div>
                  </div>
                  <span className="text-[11px] uppercase font-bold tracking-widest text-slate-600">
                    Đang quét...
                  </span>
                </div>

                {/* Scan Corners */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-blue-500 rounded-tl-lg"></div>
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-blue-500 rounded-tr-lg"></div>
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-blue-500 rounded-bl-lg"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-blue-500 rounded-br-lg"></div>

                <div className="absolute inset-0 bg-blue-500/5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              {/* Control Buttons */}
              <div className="w-full flex flex-col gap-3 pt-2">
                <button
                  type="button"
                  disabled={isScanning}
                  onClick={async () => {
                    setIsScanning(true);
                    try {
                      const qrData = `ROOM_${scanBooking.room_id}`;
                      const res = await checkInService.scanQR(qrData);
                      toast.success(res.data?.message || t('action_success'));
                      setScanBooking(null);
                      fetchData();
                    } catch (error: unknown) {
                      const err = error as any;
                      const msg = err.response?.data?.message || 'Quét thất bại';
                      toast.error(Array.isArray(msg) ? msg[0] : msg);
                    } finally {
                      setIsScanning(false);
                    }
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-[14px] font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  🚪 Quét QR Phòng ({scanBooking.room?.name})
                </button>

                {scanBooking.equipment_id && (
                  <button
                    type="button"
                    disabled={isScanning}
                    onClick={async () => {
                      setIsScanning(true);
                      try {
                        const qrData = `EQ_${scanBooking.equipment_id}`;
                        const res = await checkInService.scanQR(qrData);
                        toast.success(res.data?.message || t('action_success'));
                        setScanBooking(null);
                        fetchData();
                      } catch (error: unknown) {
                        const err = error as any;
                        const msg = err.response?.data?.message || 'Quét thất bại';
                        toast.error(Array.isArray(msg) ? msg[0] : msg);
                      } finally {
                        setIsScanning(false);
                      }
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-[14px] font-bold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    🛠️ Quét QR Thiết bị ({scanBooking.equipment?.name || 'Kèm theo'})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Slide-over Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
            onClick={() => setSelectedBooking(null)}
          ></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-neutral-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-md">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                  <FileText className="w-6 h-6 text-blue-600" />
                  Đơn #{selectedBooking.id}
                </h2>
                <div>{getStatusBadge(selectedBooking.status)}</div>
              </div>
              <button 
                onClick={() => setSelectedBooking(null)}
                className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-600 rounded-full transition-colors self-start"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Thông tin chung */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <AlertCircle className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-[14px] font-extrabold uppercase tracking-widest">Thông tin chung</h3>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <div className="text-[12px] text-slate-500 font-medium mb-0.5">Phòng Lab</div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-[15px]">{selectedBooking.room?.name}</div>
                    </div>
                  </div>
                  <div className="w-full h-px bg-slate-100 dark:bg-slate-800"></div>
                  <div>
                    <div className="text-[12px] text-slate-500 font-medium mb-1.5">Mục đích sử dụng</div>
                    <div className="text-[14px] text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      {selectedBooking.purpose}
                    </div>
                  </div>
                </div>
              </div>

              {/* Thời gian */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <h3 className="text-[14px] font-extrabold uppercase tracking-widest">Thời gian mượn</h3>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/50 flex flex-col items-center justify-center text-center gap-1">
                   <div className="font-extrabold text-[24px] text-blue-700 dark:text-blue-400 tracking-tight">
                     {format(new Date(selectedBooking.start_time), 'HH:mm')} - {format(new Date(selectedBooking.end_time), 'HH:mm')}
                   </div>
                   <div className="text-[14px] font-medium text-blue-600/80 dark:text-blue-300/80 uppercase tracking-wider">
                     {format(new Date(selectedBooking.start_time), 'EEEE, dd/MM/yyyy')}
                   </div>
                </div>
              </div>

              {/* Tài nguyên */}
              {(selectedBooking.equipment || (selectedBooking.chemical_usages && selectedBooking.chemical_usages.length > 0)) && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <Package className="w-5 h-5 text-emerald-500" />
                    <h3 className="text-[14px] font-extrabold uppercase tracking-widest">Tài nguyên đính kèm</h3>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    {selectedBooking.equipment && (
                      <div className="p-4 flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                            <span className="text-[14px]">🔬</span>
                          </div>
                          <span className="text-[14px] font-bold text-slate-700 dark:text-slate-300">{selectedBooking.equipment.name}</span>
                        </div>
                        <span className="text-[13px] font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-600 dark:text-slate-400">x1</span>
                      </div>
                    )}
                    {selectedBooking.chemical_usages?.map((cu, idx) => (
                      <div key={idx} className="p-4 flex items-center justify-between bg-white dark:bg-slate-900 border-b last:border-b-0 border-slate-100 dark:border-slate-800">
                         <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center">
                            <span className="text-[14px]">🧪</span>
                          </div>
                          <span className="text-[14px] font-bold text-slate-700 dark:text-slate-300">{cu.chemical?.name}</span>
                        </div>
                        <span className="text-[13px] font-bold bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-600 dark:text-slate-400">{cu.quantity_used} {cu.chemical?.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
              <button
                onClick={(e) => exportToICS(e, selectedBooking)}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5"
              >
                <CalendarPlus className="w-5 h-5" /> Thêm vào Lịch cá nhân
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/20 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-sm">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-[16px] flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Đánh giá trải nghiệm
              </h3>
              <button
                onClick={() => setRatingBooking(null)}
                className="p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-600 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col space-y-4">
              <p className="text-sm text-slate-500 text-center">Bạn đánh giá thế nào về phòng máy/thiết bị bạn vừa sử dụng?</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setRatingScore(star)}>
                    <Star className={`w-8 h-8 ${star <= ratingScore ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} />
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Nhận xét của bạn (không bắt buộc)..."
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <button
                onClick={handleRating}
                className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold transition-all"
              >
                Gửi Đánh Giá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Skeleton shimmer component cho Cards ──
function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
          <div>
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-16 mb-2"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24"></div>
          </div>
        </div>
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-full w-20"></div>
      </div>
      <div className="space-y-4">
        <div>
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-24 mb-2"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-2"></div>
          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-lg w-28"></div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/50">
           <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-3"></div>
           <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-2"></div>
           <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
        </div>
      </div>
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between">
        <div className="flex gap-2">
           <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800"></div>
           <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800"></div>
        </div>
        <div className="h-9 bg-slate-200 dark:bg-slate-800 rounded-xl w-24"></div>
      </div>
    </div>
  );
}
