import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import apiClient from '../../services/apiClient';
import { toast } from 'react-hot-toast';
import { Save, AlertCircle, ShieldCheck, QrCode, Settings as SettingsIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { Profile } from '../profile/Profile';

interface Setting {
  id: number;
  key: string;
  value: string;
  description: string;
  category: string;
}

export function Settings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'TECHNICIAN') {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [user]);

  async function fetchSettings() {
    try {
      const res = await apiClient.get('/api/settings');
      setSettings(res.data);
    } catch (error: unknown) {
      const err = error as any;
      const msg = err.response?.data?.message || t('settings_load_error');
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => {
      if (prev.find((s) => s.key === key)) {
        return prev.map((s) => (s.key === key ? { ...s, value } : s));
      }
      return [...prev, { id: Date.now(), key, value, description: '', category: 'GENERAL' }];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = settings.map((s) => ({ key: s.key, value: s.value }));
      await apiClient.put('/api/settings/bulk', { settings: payload });
      toast.success(t('settings_save_success'));
    } catch (error: unknown) {
      const err = error as any;
      const msg = err.response?.data?.message || t('settings_save_error');
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSaving(false);
    }
  };

  const getValue = (key: string) => {
    return settings.find((s) => s.key === key)?.value || '';
  };

  const getDesc = (key: string) => {
    return settings.find((s) => s.key === key)?.description || '';
  };



  if (loading) return <div className="p-6">{t('loading_settings')}</div>;

  return (
    <div className="h-full w-full overflow-y-auto pr-2 pb-10">
      <div className="max-w-[1000px] mx-auto flex flex-col gap-8 animate-in fade-in duration-300">
      
      {/* THẺ 1: CÀI ĐẶT HỆ THỐNG (CHỈ ADMIN) */}
      {user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' ? (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-sm border border-[#E0E0E0]/50 dark:border-slate-700/50 p-8 w-full flex-shrink-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1E5FA5] dark:text-blue-400 flex items-center gap-2">
              <SettingsIcon className="w-6 h-6" />
              {t('system_settings')}
            </h1>
            <p className="text-[#757575] dark:text-slate-400 mt-1">{t('settings_desc')}</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <Save className="w-4 h-4" />
            {saving ? t('settings_saving') : t('settings_save')}
          </button>
        </div>
        <Tabs defaultValue="booking" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-4 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-md p-1.5 rounded-xl border border-[#E0E0E0]/50 dark:border-slate-800/50">
            <TabsTrigger value="booking">{t('settings_tab_booking')}</TabsTrigger>
            <TabsTrigger value="automation">{t('settings_tab_auto')}</TabsTrigger>
            <TabsTrigger value="ui">{t('settings_tab_ui')}</TabsTrigger>
            <TabsTrigger value="maintenance">{t('settings_tab_maintenance')}</TabsTrigger>
          </TabsList>

        <TabsContent value="booking" className="space-y-4">
          <div className="border border-[#E0E0E0]/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-800/20 backdrop-blur-sm rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-4 text-[#212121] dark:text-slate-100">
              {t('settings_booking_hours')}
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[13px] font-medium mb-2 text-[#757575] dark:text-slate-400">
                  {t('settings_start_hour')}
                </label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-[#E0E0E0] dark:border-slate-800 rounded-lg p-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={getValue('BOOKING_START_HOUR')}
                  onChange={(e) => handleChange('BOOKING_START_HOUR', e.target.value)}
                />
                <p className="text-xs text-[#757575] dark:text-slate-400 mt-1">
                  {getDesc('BOOKING_START_HOUR')}
                </p>
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-2 text-[#757575] dark:text-slate-400">
                  {t('settings_end_hour')}
                </label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-[#E0E0E0] dark:border-slate-800 rounded-lg p-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={getValue('BOOKING_END_HOUR')}
                  onChange={(e) => handleChange('BOOKING_END_HOUR', e.target.value)}
                />
                <p className="text-xs text-[#757575] dark:text-slate-400 mt-1">
                  {getDesc('BOOKING_END_HOUR')}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-[13px] font-medium mb-2 text-[#757575] dark:text-slate-400">
                  {t('MIN_BOOKING_MINUTES')}
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-[#E0E0E0] dark:border-slate-800 rounded-lg p-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={getValue('MIN_BOOKING_MINUTES')}
                  onChange={(e) => handleChange('MIN_BOOKING_MINUTES', e.target.value)}
                />
                <p className="text-xs text-[#757575] dark:text-slate-400 mt-1">
                  {getDesc('MIN_BOOKING_MINUTES')}
                </p>
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-2 text-[#757575] dark:text-slate-400">
                  {t('MAX_BOOKING_MINUTES')}
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-[#E0E0E0] dark:border-slate-800 rounded-lg p-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={getValue('MAX_BOOKING_MINUTES')}
                  onChange={(e) => handleChange('MAX_BOOKING_MINUTES', e.target.value)}
                />
                <p className="text-xs text-[#757575] dark:text-slate-400 mt-1">
                  {getDesc('MAX_BOOKING_MINUTES')}
                </p>
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-2 text-[#757575] dark:text-slate-400">
                  {t('BOOKING_BUFFER_MINUTES')}
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-[#E0E0E0] dark:border-slate-800 rounded-lg p-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={getValue('BOOKING_BUFFER_MINUTES')}
                  onChange={(e) => handleChange('BOOKING_BUFFER_MINUTES', e.target.value)}
                />
                <p className="text-xs text-[#757575] dark:text-slate-400 mt-1">
                  {getDesc('BOOKING_BUFFER_MINUTES')}
                </p>
              </div>
            </div>
          </div>

          <div className="border border-[#E0E0E0]/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-800/20 backdrop-blur-sm rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-4 text-[#212121] dark:text-slate-100">
              {t('settings_booking_limits')}
            </h3>
            <div>
              <label className="block text-[13px] font-medium mb-2 text-[#757575] dark:text-slate-400">
                {t('settings_max_per_day')}
              </label>
              <input
                type="number"
                min="1"
                className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-[#E0E0E0] dark:border-slate-800 rounded-lg p-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={getValue('MAX_BOOKINGS_PER_DAY')}
                onChange={(e) => handleChange('MAX_BOOKINGS_PER_DAY', e.target.value)}
              />
              <p className="text-xs text-[#757575] dark:text-slate-400 mt-1">
                {getDesc('MAX_BOOKINGS_PER_DAY')}
              </p>
            </div>
          </div>

          <div className="border border-[#E0E0E0]/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-800/20 backdrop-blur-sm rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-4 text-[#212121] dark:text-slate-100">
              Khung thời gian đặt trước (Lead Time)
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[13px] font-medium mb-2 text-[#757575] dark:text-slate-400">
                  Cho phép đặt trước tối đa (Ngày)
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-[#E0E0E0] dark:border-slate-800 rounded-lg p-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={getValue('MAX_LEAD_TIME_DAYS') || '14'}
                  onChange={(e) => handleChange('MAX_LEAD_TIME_DAYS', e.target.value)}
                />
                <p className="text-xs text-[#757575] dark:text-slate-400 mt-1">
                  Ngăn sinh viên đặt phòng quá xa trong tương lai
                </p>
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-2 text-[#757575] dark:text-slate-400">
                  Phải đặt trước tối thiểu (Giờ)
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-[#E0E0E0] dark:border-slate-800 rounded-lg p-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={getValue('MIN_LEAD_TIME_HOURS') || '2'}
                  onChange={(e) => handleChange('MIN_LEAD_TIME_HOURS', e.target.value)}
                />
                <p className="text-xs text-[#757575] dark:text-slate-400 mt-1">
                  Thời gian chuẩn bị trước khi sử dụng phòng
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <div className="border border-[#E0E0E0]/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-800/20 backdrop-blur-sm rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-4 text-[#212121] dark:text-slate-100">
              {t('settings_auto_cancel')}
            </h3>
            
            <div className="mb-6 p-4 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-1">
                    Tự động duyệt đơn của Giảng viên (Auto-Approve)
                  </h4>
                  <p className="text-sm text-emerald-700/80 dark:text-emerald-300/80 mb-3">
                    Nếu bật, tất cả các đơn đặt phòng của Giảng viên sẽ tự động được duyệt (APPROVED) ngay lập tức mà không cần chờ Admin.
                  </p>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={getValue('AUTO_APPROVE_INSTRUCTOR') === 'true'}
                      onChange={(e) =>
                        handleChange('AUTO_APPROVE_INSTRUCTOR', e.target.checked ? 'true' : 'false')
                      }
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 dark:bg-slate-700 dark:peer-checked:bg-emerald-500"></div>
                    <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                      {getValue('AUTO_APPROVE_INSTRUCTOR') === 'true' ? 'Đang bật' : 'Đã tắt'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mb-8 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl">
                  <SettingsIcon className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-[#1E40AF] to-[#3B82F6] bg-clip-text text-transparent">
                    Cài đặt & Hồ sơ
                  </h1>
                  <p className="text-[#757575] dark:text-slate-400 mt-1">Quản lý tham số hệ thống và thông tin cá nhân của bạn</p>
                </div>
              </div>
              <div className="flex items-start gap-4 mt-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Bắt buộc Quét QR Check-in
                  </h4>
                  <p className="text-sm text-blue-700/80 dark:text-blue-300/80 mb-3">
                    {getDesc('REQUIRE_QR_CHECKIN') || 'Nếu bật, sinh viên phải quét mã QR tại phòng để điểm danh. Nếu tắt, khi tới giờ hệ thống sẽ tự động Check-in.'}
                  </p>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={getValue('REQUIRE_QR_CHECKIN') === 'true'}
                      onChange={(e) =>
                        handleChange('REQUIRE_QR_CHECKIN', e.target.checked ? 'true' : 'false')
                      }
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:bg-slate-700 dark:peer-checked:bg-blue-500"></div>
                    <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                      {getValue('REQUIRE_QR_CHECKIN') === 'true' ? 'Đang bật (Bắt buộc)' : 'Đã tắt (Tự động)'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[13px] font-medium mb-2 text-[#757575] dark:text-slate-400">
                  {t('settings_cancel_pending')}
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-[#E0E0E0] dark:border-slate-800 rounded-lg p-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={getValue('CANCEL_PENDING_HOURS')}
                  onChange={(e) => handleChange('CANCEL_PENDING_HOURS', e.target.value)}
                />
                <p className="text-xs text-[#757575] dark:text-slate-400 mt-1">
                  {getDesc('CANCEL_PENDING_HOURS')}
                </p>
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-2 text-[#757575] dark:text-slate-400">
                  {t('settings_no_show')}
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-[#E0E0E0] dark:border-slate-800 rounded-lg p-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={getValue('NO_SHOW_MINUTES')}
                  onChange={(e) => handleChange('NO_SHOW_MINUTES', e.target.value)}
                />
                <p className="text-xs text-[#757575] dark:text-slate-400 mt-1">
                  {getDesc('NO_SHOW_MINUTES')}
                </p>
              </div>
            </div>
          </div>

          <div className="border border-[#E0E0E0]/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-800/20 backdrop-blur-sm rounded-2xl p-6 shadow-sm mb-6">
            <h3 className="font-semibold text-lg mb-4 text-[#212121] dark:text-slate-100">
              Quản lý Phiên đăng nhập (Session)
            </h3>
            <div>
              <label className="block text-[13px] font-medium mb-2 text-[#757575] dark:text-slate-400">
                Tự động đăng xuất (Session Timeout)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="5"
                  className="w-32 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-[#E0E0E0] dark:border-slate-800 rounded-lg p-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={getValue('SESSION_TIMEOUT_MINUTES') || '30'}
                  onChange={(e) => handleChange('SESSION_TIMEOUT_MINUTES', e.target.value)}
                />
                <span className="text-[14px] text-[#757575] dark:text-slate-400">phút</span>
              </div>
              <p className="text-xs text-[#757575] dark:text-slate-400 mt-2">
                Tự động đăng xuất tài khoản nếu không có bất kỳ thao tác nào trong khoảng thời gian này. Cấu hình này cực kỳ quan trọng để bảo vệ dữ liệu khi sử dụng máy tính công cộng tại phòng thực hành.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ui" className="space-y-4">
          <div className="border border-[#E0E0E0]/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-800/20 backdrop-blur-sm rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-4 text-[#212121] dark:text-slate-100">
              {t('settings_ui_personalize')}
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[13px] font-medium mb-2 text-[#757575] dark:text-slate-400">
                    Múi giờ (Timezone)
                  </label>
                  <select
                    className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-[#E0E0E0] dark:border-slate-800 rounded-lg p-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={getValue('TIMEZONE') || 'GMT+7'}
                    onChange={(e) => handleChange('TIMEZONE', e.target.value)}
                  >
                    <option value="GMT+7">GMT+7 (Asia/Ho_Chi_Minh)</option>
                    <option value="UTC">UTC (Giờ phối hợp quốc tế)</option>
                    <option value="GMT+8">GMT+8 (Asia/Singapore)</option>
                    <option value="GMT+9">GMT+9 (Asia/Tokyo)</option>
                  </select>
                  <p className="text-xs text-[#757575] dark:text-slate-400 mt-1">
                    Múi giờ mặc định hiển thị trên lịch và các báo cáo
                  </p>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-2 text-[#757575] dark:text-slate-400">
                    Định dạng ngày tháng
                  </label>
                  <select
                    className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-[#E0E0E0] dark:border-slate-800 rounded-lg p-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={getValue('DATE_FORMAT') || 'DD/MM/YYYY'}
                    onChange={(e) => handleChange('DATE_FORMAT', e.target.value)}
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY (Việt Nam)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (Mỹ)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (Quốc tế)</option>
                  </select>
                  <p className="text-xs text-[#757575] dark:text-slate-400 mt-1">
                    Định dạng hiển thị thời gian trên toàn hệ thống
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>


        <TabsContent value="maintenance" className="space-y-4">
          <div className="border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 backdrop-blur-sm rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[#C62828] text-white rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-[#C62828]">
                  {t('settings_maintenance_mode')}
                </h3>
                <p className="text-sm text-[#C62828] mt-1 mb-4">{t('settings_maintenance_desc')}</p>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={getValue('MAINTENANCE_MODE') === 'true'}
                    onChange={(e) =>
                      handleChange('MAINTENANCE_MODE', e.target.checked ? 'true' : 'false')
                    }
                  />
                  <div className="w-14 h-7 bg-[#E0E0E0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-900 after:border-gray-300 dark:border-slate-600 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#C62828]"></div>
                  <span className="ml-3 text-sm font-medium text-[#C62828]">
                    {getValue('MAINTENANCE_MODE') === 'true' ? t('settings_on') : t('settings_off')}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </TabsContent>
        </Tabs>
      </div>
      ) : null}

      {/* THẺ 2: HỒ SƠ CÁ NHÂN (TẤT CẢ MỌI NGƯỜI) */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-sm border border-[#E0E0E0]/50 dark:border-slate-700/50 w-full flex-shrink-0">
        <Profile />
      </div>

      </div>
    </div>
  );
}
