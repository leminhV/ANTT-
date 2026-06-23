import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Download,
  FileText,
  Settings,
  AlertTriangle,
  CheckCircle,
  Plus,
  Search,
  RefreshCw,
  X,
  FileX,
  Trash2,
  BookOpen,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { reportService, equipmentService, roomService } from '../../services';
import { format } from 'date-fns';
import { timeAgo } from '../../utils/timeAgo';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { toast } from 'react-hot-toast';

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  switch (status) {
    case 'OPEN':
      return (
        <span className="px-3 py-1 bg-rose-100/80 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 rounded-full text-[12px] font-bold shadow-sm border border-rose-200/50 backdrop-blur-sm">
          {t('status_open')}
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className="px-3 py-1 bg-amber-100/80 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-full text-[12px] font-bold shadow-sm border border-amber-200/50 backdrop-blur-sm">
          {t('status_in_progress')}
        </span>
      );
    case 'RESOLVED':
      return (
        <span className="px-3 py-1 bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-full text-[12px] font-bold shadow-sm border border-emerald-200/50 backdrop-blur-sm">
          {t('status_resolved')}
        </span>
      );
    default:
      return (
        <span className="px-3 py-1 bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 rounded-full text-[12px] font-bold shadow-sm border border-slate-200/50 backdrop-blur-sm">
          {status}
        </span>
      );
  }
}

export function Reports() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('incidents'); // 'Thống kê' hoặc 'Sự cố'
  const location = useLocation();

  useEffect(() => {
    if (location.state?.action === 'create_report') {
      setActiveTab('incidents');
      setIsModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const [chartMonth, setChartMonth] = useState(format(new Date(), 'yyyy-MM'));

  // States cho Sự cố
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    equipment_id: '',
    room_id: '',
  });
  const [equipments, setEquipments] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [deleteConfirmReportId, setDeleteConfirmReportId] = useState<number | null>(null);

  // States cho Vận hành
  const [operationalData, setOperationalData] = useState<any | null>(null);
  const [isOpLoading, setIsOpLoading] = useState(false);

  // States cho Quản lý
  const [managementData, setManagementData] = useState<any | null>(null);
  const [isMgLoading, setIsMgLoading] = useState(false);

  // States cho Chiến lược
  const [strategicData, setStrategicData] = useState<any | null>(null);
  const [isStLoading, setIsStLoading] = useState(false);

  const currentUserStr = localStorage.getItem('user');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'TECHNICIAN';

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [repRes, eqRes, roomRes] = await Promise.all([
        isAdmin ? reportService.getAll() : reportService.getMyReports(),
        equipmentService.getAll(),
        roomService.getAll(),
      ]);
      setReports(repRes.data || []);
      setEquipments(eqRes.data || []);
      setRooms(roomRes.data || []);
    } catch (error: unknown) {
      const err = error as any;
      const msg = err.response?.data?.message || t('load_reports_error');
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (activeTab === 'incidents') {
      fetchData();
    } else if (activeTab === 'operational') {
      const fetchOp = async () => {
        setIsOpLoading(true);
        try {
          const res = await reportService.getOperational();
          setOperationalData(res.data);
        } catch (error) {
          toast.error('Không thể tải báo cáo vận hành');
        } finally {
          setIsOpLoading(false);
        }
      };
      fetchOp();
    } else if (activeTab === 'management') {
      const fetchMg = async () => {
        setIsMgLoading(true);
        try {
          const res = await reportService.getManagement();
          setManagementData(res.data);
        } catch (error) {
          toast.error('Không thể tải báo cáo quản lý');
        } finally {
          setIsMgLoading(false);
        }
      };
      fetchMg();
    } else if (activeTab === 'strategic') {
      const fetchSt = async () => {
        setIsStLoading(true);
        try {
          const res = await reportService.getStrategic();
          setStrategicData(res.data);
        } catch (error) {
          toast.error('Không thể tải báo cáo chiến lược');
        } finally {
          setIsStLoading(false);
        }
      };
      fetchSt();
    }
  }, [activeTab, fetchData]);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await reportService.create({
        title: formData.title,
        description: formData.description,
        equipment_id: formData.equipment_id ? parseInt(formData.equipment_id) : undefined,
        room_id: formData.room_id ? parseInt(formData.room_id) : undefined,
      } as any);
      toast.success(t('report_submitted_success'));
      setIsModalOpen(false);
      setFormData({ title: '', description: '', equipment_id: '', room_id: '' });
      fetchData();
    } catch (error: unknown) {
      const err = error as any;
      const msg = err.response?.data?.message || t('submit_report_failed');
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await reportService.update(id.toString(), { status });
      toast.success(t('status_updated_success'));
      fetchData();
    } catch (error: unknown) {
      const err = error as any;
      const msg = err.response?.data?.message || t('status_update_failed');
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  const handleScheduleMaintenance = async (equipmentId: number) => {
    try {
      const toastId = toast.loading('Đang lên lịch bảo trì...');
      await import('../../services/apiClient').then((m) =>
        m.default.post(`/api/reports/schedule-maintenance/${equipmentId}`)
      );
      toast.success(t('auto_maintenance_success'), { id: toastId });
      
      fetchData(); // Cập nhật lại danh sách báo cáo
    } catch (error) {
      toast.error('Lên lịch bảo trì thất bại');
    }
  };

  const executeDeleteReport = async () => {
    if (deleteConfirmReportId) {
      try {
        await reportService.delete(deleteConfirmReportId.toString());
        toast.success(t('delete_report_success'));
        setDeleteConfirmReportId(null);
        fetchData();
      } catch (error: unknown) {
        const err = error as any;
        const msg = err.response?.data?.message || t('delete_report_failed');
        toast.error(Array.isArray(msg) ? msg[0] : msg);
      }
    }
  };

  const handleExportExcel = async () => {
    if (reports.length === 0) {
      toast.error(t('no_data_export'));
      return;
    }

    try {
      const toastId = toast.loading('Đang xuất file Excel...');
      const response = await import('../../services/apiClient').then((m) =>
        m.default.get('/api/reports/export/excel', { responseType: 'blob' })
      );

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `baocao_su_co_${format(new Date(), 'ddMMyyyy')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Đã xuất báo cáo Excel', { id: toastId });
    } catch (error) {
      toast.error('Lỗi xuất báo cáo Excel');
    }
  };

  const getChartData = () => {
    const [year, month] = chartMonth.split('-');
    if (!year || !month) return [];

    // Lọc báo cáo trong tháng được chọn
    const filteredReports = reports.filter((r) => {
      const date = new Date(r.created_at);
      return date.getFullYear() === parseInt(year) && date.getMonth() + 1 === parseInt(month);
    });

    // Gom nhóm theo ngày
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const data = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const count = filteredReports.filter((r) => new Date(r.created_at).getDate() === i).length;
      data.push({ name: `${i}/${month}`, value: count });
    }
    return data;
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-300 pb-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-[24px] font-bold text-[#212121] dark:text-slate-100 mb-4">
            {isAdmin ? t('reports_and_statistics') : t('incident_reports')}
          </h1>
          {isAdmin && (
            <div className="flex border-b border-[#E0E0E0] dark:border-slate-800 overflow-x-auto whitespace-nowrap scrollbar-none">
              {['incidents', 'statistics', 'operational', 'management', 'strategic'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 text-[14px] font-medium border-b-2 transition-colors flex-shrink-0 ${
                    activeTab === tab
                      ? 'border-[#1E5FA5] text-[#1E5FA5] dark:text-blue-400'
                      : 'border-transparent text-[#757575] dark:text-slate-400 hover:text-[#212121] dark:text-slate-100'
                  }`}
                >
                  {tab === 'incidents' && t('tab_incidents')}
                  {tab === 'statistics' && t('tab_statistics')}
                  {tab === 'operational' && t('tab_operational')}
                  {tab === 'management' && t('tab_management')}
                  {tab === 'strategic' && t('tab_strategic')}
                </button>
              ))}
            </div>
          )}
        </div>
        {activeTab === 'statistics' && (
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all duration-300 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 text-[14px] mb-2"
          >
            <Download className="w-4 h-4" /> Xuất Excel
          </button>
        )}
        {activeTab === 'incidents' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 text-[14px] mb-2"
          >
            <Plus className="w-4 h-4" /> {t('report_incident_btn')}
          </button>
        )}
      </div>

      {activeTab === 'statistics' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <KPICard
              title={t('total_incidents')}
              value={reports.length}
              sub={t('all_time')}
              icon={<FileText className="w-5 h-5 text-[#1E5FA5] dark:text-blue-400" />}
              bg="bg-[#D6E4F7] dark:bg-blue-900/30/50"
            />
            <KPICard
              title={t('status_open')}
              value={reports.filter((r) => r.status === 'OPEN').length}
              sub={t('needs_review')}
              icon={<AlertTriangle className="w-5 h-5 text-[#EF4444]" />}
              bg="bg-[#FDEDED] dark:bg-red-900/30"
            />
            <KPICard
              title={t('status_in_progress')}
              value={reports.filter((r) => r.status === 'IN_PROGRESS').length}
              sub={t('technician_working')}
              icon={<Settings className="w-5 h-5 text-[#F59E0B]" />}
              bg="bg-[#FFF8E1]"
            />
            <KPICard
              title={t('status_resolved')}
              value={reports.filter((r) => r.status === 'RESOLVED').length}
              sub={t('functioning_normally')}
              icon={<CheckCircle className="w-5 h-5 text-[#2E7D32]" />}
              bg="bg-[#E8F5E9] dark:bg-green-900/30"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/50 dark:bg-slate-800/20 backdrop-blur-sm rounded-2xl shadow-sm border border-[#E0E0E0]/50 dark:border-slate-800/50 p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[16px] font-bold text-[#212121] dark:text-slate-100">
                  {t('incident_chart')}
                </h2>
                <input
                  type="month"
                  value={chartMonth}
                  onChange={(e) => setChartMonth(e.target.value)}
                  className="px-3 py-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-[#E0E0E0] dark:border-slate-800 rounded-lg text-[13px] text-[#757575] dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#757575', fontSize: 10 }}
                      dy={10}
                      interval="preserveStartEnd"
                      minTickGap={20}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#757575', fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: '#F5F5F5' }}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #E0E0E0' }}
                    />
                    <Bar dataKey="value" fill="#1E5FA5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white/50 dark:bg-slate-800/20 backdrop-blur-sm rounded-2xl shadow-sm border border-[#E0E0E0]/50 dark:border-slate-800/50 p-6">
              <h2 className="text-[16px] font-bold text-[#212121] dark:text-slate-100 mb-6">
                {t('status_ratio')}
              </h2>
              <div className="h-[280px] flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: t('status_resolved'),
                          value: reports.filter((r) => r.status === 'RESOLVED').length || 1,
                          color: '#2E7D32',
                        },
                        {
                          name: t('status_in_progress'),
                          value: reports.filter((r) => r.status === 'IN_PROGRESS').length || 1,
                          color: '#F59E0B',
                        },
                        {
                          name: t('status_open'),
                          value: reports.filter((r) => r.status === 'OPEN').length || 1,
                          color: '#EF4444',
                        },
                      ]}
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {[{ color: '#2E7D32' }, { color: '#F59E0B' }, { color: '#EF4444' }].map(
                        (entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        )
                      )}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #E0E0E0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-[140px] flex flex-col gap-4">
                  {[
                    {
                      name: t('status_resolved'),
                      value: reports.filter((r) => r.status === 'RESOLVED').length,
                      color: '#2E7D32',
                    },
                    {
                      name: t('status_in_progress'),
                      value: reports.filter((r) => r.status === 'IN_PROGRESS').length,
                      color: '#F59E0B',
                    },
                    {
                      name: t('status_open'),
                      value: reports.filter((r) => r.status === 'OPEN').length,
                      color: '#EF4444',
                    },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <div>
                        <div className="text-[12px] text-[#757575] dark:text-slate-400">
                          {item.name}
                        </div>
                        <div className="text-[14px] font-bold text-[#212121] dark:text-slate-100">
                          {item.value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'operational' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {isOpLoading ? (
            <LoadingSpinner text={t('loading_data')} />
          ) : !operationalData ? (
            <div className="text-center py-12 text-neutral-500 dark:text-slate-400">
              {t('no_data')}
            </div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard
                  title={t('room_hours_ratio')}
                  value={`${operationalData.roomStats.reduce((sum: number, r: any) => sum + r.totalBookings, 0)}`}
                  sub={t('units_bookings')}
                  icon={<BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                  bg="bg-[#D6E4F7] dark:bg-blue-900/30"
                />
                <KPICard
                  title={t('hours_used')}
                  value={`${operationalData.roomStats.reduce((sum: number, r: any) => sum + r.totalHours, 0)} h`}
                  sub={t('total')}
                  icon={<Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
                  bg="bg-indigo-100 dark:bg-indigo-900/30"
                />
                <KPICard
                  title={t('device_maintenance_list')}
                  value={`${operationalData.maintenanceDevices.length}`}
                  sub={`${operationalData.maintenanceDevices.filter((d: any) => d.status === 'BROKEN').length} ${t('status_broken')} / ${operationalData.maintenanceDevices.filter((d: any) => d.status === 'MAINTENANCE').length} ${t('status_maintenance')}`}
                  icon={<AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
                  bg="bg-[#FDEDED] dark:bg-red-900/30"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Biểu đồ hoạt động phòng Lab */}
                <div className="lg:col-span-2 bg-white/50 dark:bg-slate-800/20 backdrop-blur-sm rounded-2xl shadow-sm border border-[#E0E0E0]/50 dark:border-slate-800/50 p-6 flex flex-col">
                  <h2 className="text-[16px] font-bold text-[#212121] dark:text-slate-100 mb-6">
                    {t('room_hours_ratio')}
                  </h2>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={operationalData.roomStats}
                        layout="vertical"
                        margin={{ left: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E0E0E0" />
                        <XAxis type="number" tick={{ fill: '#757575', fontSize: 11 }} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tick={{ fill: '#757575', fontSize: 11 }}
                          width={150}
                        />
                        <Tooltip
                          cursor={{ fill: '#F5F5F5' }}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #E0E0E0' }}
                        />
                        <Bar
                          dataKey="totalHours"
                          name={t('hours_used')}
                          fill="#1E5FA5"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Tỷ lệ khai thác phòng lab dạng danh sách */}
                <div className="bg-white/50 dark:bg-slate-800/20 backdrop-blur-sm rounded-2xl shadow-sm border border-[#E0E0E0]/50 dark:border-slate-800/50 p-6 flex flex-col">
                  <h2 className="text-[16px] font-bold text-[#212121] dark:text-slate-100 mb-4">
                    {t('status_ratio')} (%)
                  </h2>
                  <div className="space-y-4 overflow-y-auto flex-1 max-h-[300px] pr-2 scrollbar-thin scrollbar-thumb-[#E0E0E0] dark:scrollbar-thumb-slate-700">
                    {operationalData.roomStats.map((room: any) => (
                      <div key={room.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-[#212121] dark:text-slate-200 line-clamp-1">
                            {room.name}
                          </span>
                          <span className="font-bold text-[#1E5FA5] dark:text-blue-400">
                            {room.utilizationRate}%
                          </span>
                        </div>
                        <div className="w-full bg-neutral-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full"
                            style={{ width: `${room.utilizationRate}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bảng thiết bị cần bảo trì */}
              <div className="bg-white/50 dark:bg-slate-800/20 backdrop-blur-sm rounded-2xl shadow-sm border border-[#E0E0E0]/50 dark:border-slate-800/50 overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E0E0E0]/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
                  <div>
                    <h2 className="text-[16px] font-bold text-[#212121] dark:text-slate-100">
                      {t('device_maintenance_list')}
                    </h2>
                    <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">
                      {t('device_maintenance_desc')}
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-[#E0E0E0] dark:scrollbar-thumb-slate-700">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
                      <tr className="border-b border-[#E0E0E0]/50 dark:border-slate-800/50">
                        <th className="px-6 py-3.5 text-[13px] font-semibold text-neutral-500 dark:text-slate-400">
                          ID
                        </th>
                        <th className="px-6 py-3.5 text-[13px] font-semibold text-neutral-500 dark:text-slate-400">
                          {t('device_name')}
                        </th>
                        <th className="px-6 py-3.5 text-[13px] font-semibold text-neutral-500 dark:text-slate-400">
                          {t('serial_number')}
                        </th>
                        <th className="px-6 py-3.5 text-[13px] font-semibold text-neutral-500 dark:text-slate-400">
                          {t('lab_room')}
                        </th>
                        <th className="px-6 py-3.5 text-[13px] font-semibold text-neutral-500 dark:text-slate-400">
                          {t('status')}
                        </th>
                        <th className="px-6 py-3.5 text-[13px] font-semibold text-neutral-500 dark:text-slate-400">
                          {t('last_maintenance')}
                        </th>
                        {isAdmin && (
                          <th className="px-6 py-3.5 text-[13px] font-semibold text-neutral-500 dark:text-slate-400 text-center">
                            Hành động
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E0E0E0] dark:divide-slate-800">
                      {operationalData.maintenanceDevices.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-6 py-8 text-center text-neutral-500 dark:text-slate-400"
                          >
                            Không có thiết bị nào cần bảo trì/hỏng hóc.
                          </td>
                        </tr>
                      ) : (
                        operationalData.maintenanceDevices.map((dev: any) => (
                          <tr
                            key={dev.id}
                            className="hover:bg-neutral-50 dark:hover:bg-slate-800/50"
                          >
                            <td className="px-6 py-4 text-sm text-neutral-700 dark:text-slate-300">
                              #{dev.id}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-neutral-900 dark:text-slate-200">
                              {dev.name}
                            </td>
                            <td className="px-6 py-4 text-sm text-neutral-700 dark:text-slate-300">
                              {dev.serialNumber}
                            </td>
                            <td className="px-6 py-4 text-sm text-neutral-700 dark:text-slate-300">
                              {dev.roomName}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {dev.status === 'BROKEN' ? (
                                <span className="px-2 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded border border-red-200 dark:border-red-800 font-medium">
                                  {t('status_broken')}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded border border-orange-200 dark:border-orange-800 font-medium">
                                  {t('status_maintenance')}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-neutral-700 dark:text-slate-300">
                              {dev.lastMaintenance
                                ? format(new Date(dev.lastMaintenance), 'dd/MM/yyyy')
                                : t('never_maintained')}
                            </td>
                            {isAdmin && (
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={() => handleScheduleMaintenance(dev.id)}
                                  className="px-3 py-1.5 bg-[#E8F5E9] dark:bg-green-900/30 text-[#2E7D32] hover:bg-[#C8E6C9] hover:dark:bg-green-900/50 rounded-lg text-xs font-semibold transition-colors border border-[#C8E6C9]"
                                >
                                  Lên lịch bảo trì
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Bảng theo dõi tiêu hao vật tư/hóa chất (Burn Rate) */}
              <div className="bg-white/50 dark:bg-slate-800/20 backdrop-blur-sm rounded-2xl shadow-sm border border-[#E0E0E0]/50 dark:border-slate-800/50 overflow-hidden mt-6">
                <div className="px-6 py-4 border-b border-[#E0E0E0]/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30">
                  <h2 className="text-[16px] font-bold text-[#212121] dark:text-slate-100">
                    Báo cáo Tốc độ tiêu hao Vật tư/Hóa chất (Burn Rate)
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">
                    Top 5 vật tư có tốc độ tiêu hao nhanh nhất dựa trên lịch sử sử dụng.
                  </p>
                </div>
                <div className="overflow-x-auto overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-[#E0E0E0] dark:scrollbar-thumb-slate-700">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
                      <tr className="border-b border-[#E0E0E0]/50 dark:border-slate-800/50">
                        <th className="px-6 py-3.5 text-[13px] font-semibold text-neutral-500 dark:text-slate-400">
                          ID
                        </th>
                        <th className="px-6 py-3.5 text-[13px] font-semibold text-neutral-500 dark:text-slate-400">
                          Tên Hóa chất/Vật tư
                        </th>
                        <th className="px-6 py-3.5 text-[13px] font-semibold text-neutral-500 dark:text-slate-400 text-right">
                          Tổng số lượng đã dùng
                        </th>
                        <th className="px-6 py-3.5 text-[13px] font-semibold text-neutral-500 dark:text-slate-400 text-right">
                          Tồn kho hiện tại
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E0E0E0] dark:divide-slate-800">
                      {!operationalData.chemicalBurnRate || operationalData.chemicalBurnRate.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-6 py-8 text-center text-neutral-500 dark:text-slate-400"
                          >
                            Chưa có dữ liệu tiêu thụ hóa chất.
                          </td>
                        </tr>
                      ) : (
                        operationalData.chemicalBurnRate.map((chem: any) => (
                          <tr
                            key={chem.id}
                            className="hover:bg-neutral-50 dark:hover:bg-slate-800/50"
                          >
                            <td className="px-6 py-4 text-sm text-neutral-700 dark:text-slate-300">
                              #{chem.id}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-neutral-900 dark:text-slate-200">
                              {chem.name}
                            </td>
                            <td className="px-6 py-4 text-sm text-right font-semibold text-rose-600 dark:text-rose-400">
                              {chem.totalUsed} {chem.unit}
                            </td>
                            <td className="px-6 py-4 text-sm text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                              {chem.stockRemaining} {chem.unit}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'management' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {isMgLoading ? (
            <LoadingSpinner text={t('loading_data')} />
          ) : !managementData ? (
            <div className="text-center py-12 text-neutral-500 dark:text-slate-400">
              {t('no_data')}
            </div>
          ) : (
            <>
              {/* Biểu đồ phân bố giờ thực hành học phần */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Giờ giảng dạy theo Giảng viên */}
                <div className="bg-white/50 dark:bg-slate-800/20 backdrop-blur-sm rounded-2xl shadow-sm border border-[#E0E0E0]/50 dark:border-slate-800/50 p-6 flex flex-col">
                  <h2 className="text-[16px] font-bold text-[#212121] dark:text-slate-100 mb-6">
                    {t('instructor_performance')}
                  </h2>
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={managementData.instructorStats}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                        <XAxis dataKey="name" tick={{ fill: '#757575', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#757575', fontSize: 11 }} unit=" h" />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: '1px solid #E0E0E0' }}
                        />
                        <Bar
                          dataKey="totalHours"
                          name={t('total_hours_used')}
                          fill="#6366F1"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Tỷ lệ giờ học phần */}
                <div className="bg-white/50 dark:bg-slate-800/20 backdrop-blur-sm rounded-2xl shadow-sm border border-[#E0E0E0]/50 dark:border-slate-800/50 p-6 flex flex-col">
                  <h2 className="text-[16px] font-bold text-[#212121] dark:text-slate-100 mb-6">
                    {t('course_performance')}
                  </h2>
                  <div className="h-[260px] flex items-center justify-center">
                    <ResponsiveContainer width="60%" height="100%">
                      <PieChart>
                        <Pie
                          data={managementData.courseStats.filter((c: any) => c.totalHours > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="totalHours"
                          nameKey="name"
                        >
                          {managementData.courseStats
                            .filter((c: any) => c.totalHours > 0)
                            .map((_: any, index: number) => {
                              const colors = [
                                '#10B981',
                                '#3B82F6',
                                '#F59E0B',
                                '#EF4444',
                                '#8B5CF6',
                                '#EC4899',
                              ];
                              return (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                              );
                            })}
                        </Pie>
                        <Tooltip formatter={(val) => [`${val} h`, 'Tổng số giờ']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="w-[40%] flex flex-col gap-2 overflow-y-auto max-h-[220px] scrollbar-thin scrollbar-thumb-[#E0E0E0] dark:scrollbar-thumb-slate-700 pr-2">
                      {managementData.courseStats
                        .filter((c: any) => c.totalHours > 0)
                        .map((c: any, index: number) => {
                          const colors = [
                            '#10B981',
                            '#3B82F6',
                            '#F59E0B',
                            '#EF4444',
                            '#8B5CF6',
                            '#EC4899',
                          ];
                          return (
                            <div key={c.id} className="flex items-center gap-2">
                              <div
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: colors[index % colors.length] }}
                              ></div>
                              <div className="text-xs truncate">
                                <span className="font-bold text-[#212121] dark:text-slate-200">
                                  {c.code}
                                </span>
                                : {c.totalHours}h
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bảng Giảng viên */}
              <div className="bg-white/50 dark:bg-slate-800/20 backdrop-blur-sm rounded-2xl shadow-sm border border-[#E0E0E0]/50 dark:border-slate-800/50 overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E0E0E0]/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30">
                  <h2 className="text-[16px] font-bold text-[#212121] dark:text-slate-100">
                    {t('instructor_performance')}
                  </h2>
                </div>
                <div className="overflow-x-auto overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-[#E0E0E0] dark:scrollbar-thumb-slate-700">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
                      <tr className="border-b border-[#E0E0E0]/50 dark:border-slate-800/50">
                        <th className="px-6 py-3 text-[13px] font-semibold text-neutral-500 dark:text-slate-400">
                          {t('instructor_name')}
                        </th>
                        <th className="px-6 py-3 text-[13px] font-semibold text-neutral-500 dark:text-slate-400">
                          {t('email')}
                        </th>
                        <th className="px-6 py-3 text-[13px] font-semibold text-neutral-500 dark:text-slate-400 text-center">
                          {t('course_count')}
                        </th>
                        <th className="px-6 py-3 text-[13px] font-semibold text-neutral-500 dark:text-slate-400 text-center">
                          {t('booking_count')}
                        </th>
                        <th className="px-6 py-3 text-[13px] font-semibold text-neutral-500 dark:text-slate-400 text-right">
                          {t('total_hours_used')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E0E0E0] dark:divide-slate-800">
                      {managementData.instructorStats.map((ins: any) => (
                        <tr key={ins.id} className="hover:bg-neutral-50 dark:hover:bg-slate-800/50">
                          <td className="px-6 py-4 text-sm font-bold text-neutral-900 dark:text-slate-200">
                            {ins.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-700 dark:text-slate-300">
                            {ins.email}
                          </td>
                          <td className="px-6 py-4 text-sm text-center text-neutral-700 dark:text-slate-300">
                            {ins.totalCourses}
                          </td>
                          <td className="px-6 py-4 text-sm text-center text-neutral-700 dark:text-slate-300">
                            {ins.totalBookings}
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-bold text-[#1E5FA5] dark:text-blue-400">
                            {ins.totalHours} h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bảng Học phần */}
              <div className="bg-white/50 dark:bg-slate-800/20 backdrop-blur-sm rounded-2xl shadow-sm border border-[#E0E0E0]/50 dark:border-slate-800/50 overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E0E0E0]/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30">
                  <h2 className="text-[16px] font-bold text-[#212121] dark:text-slate-100">
                    {t('course_performance')}
                  </h2>
                </div>
                <div className="overflow-x-auto overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-[#E0E0E0] dark:scrollbar-thumb-slate-700">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
                      <tr className="border-b border-[#E0E0E0]/50 dark:border-slate-800/50">
                        <th className="px-6 py-3 text-[13px] font-semibold text-neutral-500 dark:text-slate-400">
                          {t('course_code_label')}
                        </th>
                        <th className="px-6 py-3 text-[13px] font-semibold text-neutral-500 dark:text-slate-400">
                          {t('course_name_label')}
                        </th>
                        <th className="px-6 py-3 text-[13px] font-semibold text-neutral-500 dark:text-slate-400">
                          {t('instructor_name')}
                        </th>
                        <th className="px-6 py-3 text-[13px] font-semibold text-neutral-500 dark:text-slate-400 text-center">
                          {t('booking_count')}
                        </th>
                        <th className="px-6 py-3 text-[13px] font-semibold text-neutral-500 dark:text-slate-400 text-right">
                          {t('total_hours_used')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E0E0E0] dark:divide-slate-800">
                      {managementData.courseStats.map((c: any) => (
                        <tr key={c.id} className="hover:bg-neutral-50 dark:hover:bg-slate-800/50">
                          <td className="px-6 py-4 text-sm font-bold text-neutral-900 dark:text-slate-200">
                            {c.code}
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-700 dark:text-slate-300">
                            {c.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-700 dark:text-slate-300">
                            {c.instructorName}
                          </td>
                          <td className="px-6 py-4 text-sm text-center text-neutral-700 dark:text-slate-300">
                            {c.totalBookings}
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-bold text-[#1E5FA5] dark:text-blue-400">
                            {c.totalHours} h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'strategic' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {isStLoading ? (
            <LoadingSpinner text={t('loading_data')} />
          ) : !strategicData ? (
            <div className="text-center py-12 text-neutral-500 dark:text-slate-400">
              {t('no_data')}
            </div>
          ) : (
            <>
              {/* Biểu đồ ROI và NC KH */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ROI theo Phòng Lab */}
                <div className="bg-white/50 dark:bg-slate-800/20 backdrop-blur-sm rounded-2xl shadow-sm border border-[#E0E0E0]/50 dark:border-slate-800/50 p-6 flex flex-col">
                  <h2 className="text-[16px] font-bold text-[#212121] dark:text-slate-100 mb-2">
                    {t('strategic_roi')}
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-slate-400 mb-6">
                    {t('strategic_roi_desc')}
                  </p>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={strategicData.strategicStats}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                        <XAxis dataKey="name" tick={{ fill: '#757575', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#757575', fontSize: 11 }} unit="%" />
                        <Tooltip formatter={(value) => [`${value}%`, t('roi_label')]} />
                        <Bar
                          dataKey="roi"
                          name={t('roi_label')}
                          fill="#10B981"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Xu thế công bố khoa học */}
                <div className="bg-white/50 dark:bg-slate-800/20 backdrop-blur-sm rounded-2xl shadow-sm border border-[#E0E0E0]/50 dark:border-slate-800/50 p-6 flex flex-col">
                  <h2 className="text-[16px] font-bold text-[#212121] dark:text-slate-100 mb-2">
                    {t('publication_trend')}
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-slate-400 mb-6">
                    {t('publication_trend_desc')}
                  </p>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={strategicData.publicationTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                        <XAxis dataKey="year" tick={{ fill: '#757575', fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fill: '#757575', fontSize: 11 }} />
                        <Tooltip
                          formatter={(value) => [
                            `${value} ${t('publications_unit')}`,
                            t('publication_trend'),
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          name={t('publication_trend')}
                          stroke="#8B5CF6"
                          strokeWidth={3}
                          dot={{ r: 6 }}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Bảng ROI chi tiết */}
              <div className="bg-white/50 dark:bg-slate-800/20 backdrop-blur-sm rounded-2xl shadow-sm border border-[#E0E0E0]/50 dark:border-slate-800/50 overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E0E0E0]/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30">
                  <h2 className="text-[16px] font-bold text-[#212121] dark:text-slate-100">
                    {t('strategic_roi')}
                  </h2>
                </div>
                <div className="overflow-x-auto overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-[#E0E0E0] dark:scrollbar-thumb-slate-700">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
                      <tr className="border-b border-[#E0E0E0]/50 dark:border-slate-800/50">
                        <th className="px-6 py-3 text-[13px] font-semibold text-neutral-500 dark:text-slate-400">
                          {t('lab_room')}
                        </th>
                        <th className="px-6 py-3 text-[13px] font-semibold text-neutral-500 dark:text-slate-400 text-right">
                          {t('lab_investment_label')}
                        </th>
                        <th className="px-6 py-3 text-[13px] font-semibold text-neutral-500 dark:text-slate-400 text-center">
                          {t('hours_used')}
                        </th>
                        <th className="px-6 py-3 text-[13px] font-semibold text-neutral-500 dark:text-slate-400 text-right">
                          {t('convert_value_label')}
                        </th>
                        <th className="px-6 py-3 text-[13px] font-semibold text-neutral-500 dark:text-slate-400 text-right">
                          {t('roi_label')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E0E0E0] dark:divide-slate-800">
                      {strategicData.strategicStats.map((room: any) => (
                        <tr
                          key={room.id}
                          className="hover:bg-neutral-50 dark:hover:bg-slate-800/50"
                        >
                          <td className="px-6 py-4 text-sm font-bold text-neutral-900 dark:text-slate-200">
                            {room.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-neutral-700 dark:text-slate-300">
                            {room.totalInvestment.toLocaleString()} VNĐ
                          </td>
                          <td className="px-6 py-4 text-sm text-center text-neutral-700 dark:text-slate-300 font-medium">
                            {room.totalHours} h
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-neutral-700 dark:text-slate-300">
                            {room.totalValue.toLocaleString()} VNĐ
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {room.roi}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bảng Danh sách Công bố Khoa học */}
              <div className="bg-white/50 dark:bg-slate-800/20 backdrop-blur-sm rounded-2xl shadow-sm border border-[#E0E0E0]/50 dark:border-slate-800/50 overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E0E0E0]/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30">
                  <h2 className="text-[16px] font-bold text-[#212121] dark:text-slate-100">
                    {t('publications_list')}
                  </h2>
                </div>
                <div className="overflow-x-auto overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-[#E0E0E0] dark:scrollbar-thumb-slate-700">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
                      <tr className="border-b border-[#E0E0E0]/50 dark:border-slate-800/50">
                        <th className="px-6 py-3 text-[13px] font-semibold text-neutral-500 dark:text-slate-400">
                          {t('publication_title')}
                        </th>
                        <th className="px-6 py-3 text-[13px] font-semibold text-neutral-500 dark:text-slate-400">
                          {t('publication_authors')}
                        </th>
                        <th className="px-6 py-3 text-[13px] font-semibold text-neutral-500 dark:text-slate-400">
                          {t('publication_journal')}
                        </th>
                        <th className="px-6 py-3 text-[13px] font-semibold text-neutral-500 dark:text-slate-400 text-center">
                          {t('publication_year')}
                        </th>
                        <th className="px-6 py-3 text-[13px] font-semibold text-neutral-500 dark:text-slate-400">
                          {t('lab_room')}
                        </th>
                        <th className="px-6 py-3 text-[13px] font-semibold text-neutral-500 dark:text-slate-400">
                          {t('publication_doi')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E0E0E0] dark:divide-slate-800">
                      {strategicData.publications.map((pub: any) => (
                        <tr key={pub.id} className="hover:bg-neutral-50 dark:hover:bg-slate-800/50">
                          <td className="px-6 py-4 text-sm font-bold text-neutral-900 dark:text-slate-200">
                            {pub.title}
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-700 dark:text-slate-300">
                            {pub.authors}
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-700 dark:text-slate-300 italic">
                            {pub.journal}
                          </td>
                          <td className="px-6 py-4 text-sm text-center text-neutral-700 dark:text-slate-300">
                            {pub.year}
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-700 dark:text-slate-300">
                            {pub.roomName}
                          </td>
                          <td className="px-6 py-4 text-sm text-neutral-500 dark:text-slate-400">
                            {pub.doi || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'incidents' && (
        <div className="space-y-6 animate-in fade-in duration-300 flex-1 flex flex-col min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-shrink-0">
            <KPICard
              title={t('total_incidents')}
              value={reports.length}
              sub={t('all_time')}
              icon={<FileText className="w-5 h-5 text-[#1E5FA5] dark:text-blue-400" />}
              bg="bg-[#D6E4F7] dark:bg-blue-900/30/50"
            />
            <KPICard
              title={t('status_open')}
              value={reports.filter((r) => r.status === 'OPEN').length}
              sub={t('needs_review')}
              icon={<AlertTriangle className="w-5 h-5 text-[#EF4444]" />}
              bg="bg-[#FDEDED] dark:bg-red-900/30"
            />
            <KPICard
              title={t('status_in_progress')}
              value={reports.filter((r) => r.status === 'IN_PROGRESS').length}
              sub={t('technician_working')}
              icon={<Settings className="w-5 h-5 text-[#F59E0B]" />}
              bg="bg-[#FFF8E1]"
            />
            <KPICard
              title={t('status_resolved')}
              value={reports.filter((r) => r.status === 'RESOLVED').length}
              sub={t('functioning_normally')}
              icon={<CheckCircle className="w-5 h-5 text-[#2E7D32]" />}
              bg="bg-[#E8F5E9] dark:bg-green-900/30"
            />
          </div>

          <div className="bg-white/40 dark:bg-slate-800/20 backdrop-blur-md rounded-3xl shadow-xl border border-white/50 dark:border-slate-700/50 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="p-5 border-b border-white/40 dark:border-slate-800/50 bg-white/50 dark:bg-slate-800/30 backdrop-blur-md flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative w-full md:w-[320px] group">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="text"
                  placeholder={t('search_reports')}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-2xl text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-slate-300 shadow-sm"
                />
              </div>
              <button
                onClick={fetchData}
                className="p-2.5 text-slate-500 hover:text-blue-600 bg-white hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl shadow-sm transition-all flex items-center justify-center border border-slate-200 dark:border-slate-700"
                title="Làm mới"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 shadow-sm animate-pulse h-48"></div>
                   <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 shadow-sm animate-pulse h-48"></div>
                   <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 shadow-sm animate-pulse h-48"></div>
                </div>
              ) : reports.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-full flex items-center justify-center mb-4 shadow-inner">
                    <FileX className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">{t('no_reports')}</h3>
                  <p className="text-sm text-slate-500">Chưa có sự cố nào được ghi nhận.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {reports.map((r) => (
                    <div
                      key={r.id}
                      className="group bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center border border-rose-100 dark:border-rose-800/50">
                            <AlertTriangle className="w-5 h-5 text-rose-500" />
                          </div>
                          <div>
                            <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider line-clamp-1">{r.user?.name || 'Khách'}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{timeAgo(r.created_at)}</div>
                          </div>
                        </div>
                        <StatusBadge status={r.status} />
                      </div>

                      <div className="flex-1 space-y-3">
                        <h4 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                          {r.title}
                        </h4>
                        <p className="text-[13px] text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                          {r.description}
                        </p>
                        <div className="pt-3 flex flex-wrap gap-2">
                          {r.equipment && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[11px] font-bold border border-indigo-100 dark:border-indigo-800/50">
                              <Settings className="w-3 h-3" /> {r.equipment.name}
                            </span>
                          )}
                          {r.room && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[11px] font-bold border border-blue-100 dark:border-blue-800/50">
                              <BookOpen className="w-3 h-3" /> {r.room.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <div className="flex gap-2">
                            {r.status === 'OPEN' && (
                              <button
                                onClick={() => handleUpdateStatus(r.id, 'IN_PROGRESS')}
                                className="px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-xl text-[12px] font-bold transition-colors"
                              >
                                Bắt đầu sửa
                              </button>
                            )}
                            {r.status === 'IN_PROGRESS' && (
                              <button
                                onClick={() => handleUpdateStatus(r.id, 'RESOLVED')}
                                className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl text-[12px] font-bold transition-colors"
                              >
                                Hoàn tất
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => setDeleteConfirmReportId(r.id)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                            title={t('delete_report')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Drawer Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-md">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-rose-500" />
                  Báo cáo hỏng hóc
                </h2>
                <p className="text-[13px] text-slate-500 mt-1">Điền thông tin chi tiết để kỹ thuật viên xử lý.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-600 rounded-full transition-colors self-start"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateReport} className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/50 mb-2">
                  <div className="flex gap-3 items-center">
                    <button type="button" className="flex-1 py-2.5 bg-white dark:bg-slate-800 rounded-xl text-[13px] font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 hover:bg-blue-600 hover:text-white transition-all shadow-sm flex justify-center items-center gap-2">
                       📷 Tải ảnh lên
                    </button>
                    <button type="button" className="flex-1 py-2.5 bg-white dark:bg-slate-800 rounded-xl text-[13px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex justify-center items-center gap-2">
                       <span className="text-[16px]">🔍</span> Quét mã QR
                    </button>
                  </div>
                  <p className="text-[11px] text-center text-blue-500 mt-2 font-medium">Bổ sung hình ảnh hoặc quét QR để điền nhanh thiết bị</p>
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    {t('incident_title')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    placeholder={t('example_title')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                      {t('broken_equipment_optional')}
                    </label>
                    <select
                      value={formData.equipment_id}
                      onChange={(e) => setFormData({ ...formData, equipment_id: e.target.value })}
                      className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    >
                      <option value="">Không có</option>
                      {equipments.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                      {t('broken_room_optional')}
                    </label>
                    <select
                      value={formData.room_id}
                      onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                      className="w-full px-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    >
                      <option value="">Không có</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Mức độ khẩn cấp
                  </label>
                  <div className="flex gap-2">
                    <label className="flex-1 cursor-pointer">
                      <input type="radio" name="priority" className="peer sr-only" defaultChecked />
                      <div className="py-2 text-center text-[12px] font-bold rounded-xl border border-slate-200 text-slate-500 peer-checked:bg-slate-100 peer-checked:text-slate-900 peer-checked:border-slate-300 transition-all">Bình thường</div>
                    </label>
                    <label className="flex-1 cursor-pointer">
                      <input type="radio" name="priority" className="peer sr-only" />
                      <div className="py-2 text-center text-[12px] font-bold rounded-xl border border-amber-200 text-amber-600 peer-checked:bg-amber-100 peer-checked:border-amber-400 transition-all">Sửa gấp</div>
                    </label>
                    <label className="flex-1 cursor-pointer">
                      <input type="radio" name="priority" className="peer sr-only" />
                      <div className="py-2 text-center text-[12px] font-bold rounded-xl border border-rose-200 text-rose-600 peer-checked:bg-rose-100 peer-checked:border-rose-400 transition-all">Nguy hiểm</div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    {t('detailed_description')} <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none custom-scrollbar"
                    placeholder={t('describe_issue')}
                  ></textarea>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5"
                >
                  Gửi báo cáo sự cố
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirmReportId !== null}
        title={t('delete_report_modal_title')}
        message={t('delete_report_confirm_msg')}
        confirmText={t('delete_report')}
        isDestructive={true}
        onConfirm={executeDeleteReport}
        onCancel={() => setDeleteConfirmReportId(null)}
      />
    </div>
  );
}

function KPICard({
  title,
  value,
  sub,
  icon,
  bg,
}: {
  title: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <div className="relative overflow-hidden bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl rounded-3xl shadow-sm border border-white/60 dark:border-slate-700/50 p-6 flex flex-col gap-4 transition-all hover:-translate-y-1 hover:shadow-xl group">
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
      
      <div className="flex justify-between items-start">
        <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center flex-shrink-0 shadow-inner ring-1 ring-white/50 dark:ring-white/10`}>
          {icon}
        </div>
      </div>
      <div>
        <div className="text-[28px] font-extrabold text-slate-800 dark:text-slate-100 leading-none mb-1 tracking-tight">
          {value}
        </div>
        <div className="text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
          {title}
        </div>
        <div className="text-[12px] text-slate-400 dark:text-slate-500 font-medium">{sub}</div>
      </div>
    </div>
  );
}
