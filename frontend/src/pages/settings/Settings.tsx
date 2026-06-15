import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import apiClient from '../../services/apiClient';
import { toast } from 'react-hot-toast';
import { Save, AlertCircle, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authService } from '../../services';

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

  // 2FA states
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [isMfaEnabled, setIsMfaEnabled] = useState(false);

  useEffect(() => {
    fetchSettings();
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsMfaEnabled(!!user.is_mfa_enabled);
      } catch (e) { console.error(e); }
    }
  }, []);

  async function fetchSettings() {
    try {
      const res = await apiClient.get('/api/settings');
      setSettings(res.data);
    } catch (error: any) {
      const msg = error.response?.data?.message || t("settings_load_error");
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
      toast.success(t("settings_save_success"));
    } catch (error: any) {
      const msg = error.response?.data?.message || t("settings_save_error");
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

  const handleGenerateMfa = async () => {
    try {
      setSetupLoading(true);
      const response = await authService.generateMfa();
      setQrCodeUrl(response.data.qrCodeDataUrl);
    } catch (error: any) {
      const msg = error.response?.data?.message || t("mfa_gen_error");
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleVerifyMfaSetup = async () => {
    try {
      setSetupLoading(true);
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);
      
      await authService.verifyMfa({ userId: user.id, code: mfaCode });
      toast.success(t("mfa_setup_success"));
      setQrCodeUrl(null);
      setMfaCode('');
      setIsMfaEnabled(true);
      
      // Update local storage
      user.is_mfa_enabled = true;
      localStorage.setItem('user', JSON.stringify(user));
    } catch (err: any) {
      toast.error(err.response?.data?.message || t("mfa_invalid_code"));
    } finally {
      setSetupLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!window.confirm(t("mfa_disable_confirm"))) return;
    try {
      setSetupLoading(true);
      await authService.disableMfa();
      toast.success(t("mfa_disable_success"));
      setIsMfaEnabled(false);
      
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.is_mfa_enabled = false;
        localStorage.setItem('user', JSON.stringify(user));
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || t("mfa_disable_error");
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSetupLoading(false);
    }
  };

  if (loading) return <div className="p-6">{t("loading_settings")}</div>;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm dark:shadow-slate-900/50 p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E5FA5] dark:text-blue-400">{t("settings_title")}</h1>
          <p className="text-[#757575] dark:text-slate-400 mt-1">{t("settings_desc")}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#1E5FA5] dark:bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-[#15467A] disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? t("settings_saving") : t("settings_save")}
        </button>
      </div>

      <Tabs defaultValue="booking" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-5 bg-[#F5F5F5] dark:bg-slate-800/50 p-1 rounded-md">
          <TabsTrigger value="booking">{t("settings_tab_booking")}</TabsTrigger>
          <TabsTrigger value="automation">{t("settings_tab_auto")}</TabsTrigger>
          <TabsTrigger value="ui">{t("settings_tab_ui")}</TabsTrigger>
          <TabsTrigger value="security">{t("mfa_tab")}</TabsTrigger>
          <TabsTrigger value="maintenance">{t("settings_tab_maintenance")}</TabsTrigger>
        </TabsList>

        <TabsContent value="booking" className="space-y-4">
          <div className="border border-[#E0E0E0] dark:border-slate-800 rounded-lg p-5">
            <h3 className="font-semibold text-lg mb-4 text-[#212121] dark:text-slate-100">{t("settings_booking_hours")}</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#757575] dark:text-slate-400">{t("settings_start_hour")}</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  className="w-full border border-[#E0E0E0] dark:border-slate-800 rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50"
                  value={getValue('BOOKING_START_HOUR')}
                  onChange={(e) => handleChange('BOOKING_START_HOUR', e.target.value)}
                />
                <p className="text-xs text-[#757575] dark:text-slate-400 mt-1">{getDesc('BOOKING_START_HOUR')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[#757575] dark:text-slate-400">{t("settings_end_hour")}</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  className="w-full border border-[#E0E0E0] dark:border-slate-800 rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50"
                  value={getValue('BOOKING_END_HOUR')}
                  onChange={(e) => handleChange('BOOKING_END_HOUR', e.target.value)}
                />
                <p className="text-xs text-[#757575] dark:text-slate-400 mt-1">{getDesc('BOOKING_END_HOUR')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#757575] dark:text-slate-400">{t("MIN_BOOKING_MINUTES")}</label>
                <input
                  type="number"
                  min="1"
                  className="w-full border border-[#E0E0E0] dark:border-slate-800 rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50"
                  value={getValue('MIN_BOOKING_MINUTES')}
                  onChange={(e) => handleChange('MIN_BOOKING_MINUTES', e.target.value)}
                />
                <p className="text-xs text-[#757575] dark:text-slate-400 mt-1">{getDesc('MIN_BOOKING_MINUTES')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[#757575] dark:text-slate-400">{t("MAX_BOOKING_MINUTES")}</label>
                <input
                  type="number"
                  min="1"
                  className="w-full border border-[#E0E0E0] dark:border-slate-800 rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50"
                  value={getValue('MAX_BOOKING_MINUTES')}
                  onChange={(e) => handleChange('MAX_BOOKING_MINUTES', e.target.value)}
                />
                <p className="text-xs text-[#757575] dark:text-slate-400 mt-1">{getDesc('MAX_BOOKING_MINUTES')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[#757575] dark:text-slate-400">{t("BOOKING_BUFFER_MINUTES")}</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-[#E0E0E0] dark:border-slate-800 rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50"
                  value={getValue('BOOKING_BUFFER_MINUTES')}
                  onChange={(e) => handleChange('BOOKING_BUFFER_MINUTES', e.target.value)}
                />
                <p className="text-xs text-[#757575] dark:text-slate-400 mt-1">{getDesc('BOOKING_BUFFER_MINUTES')}</p>
              </div>
            </div>
          </div>

          <div className="border border-[#E0E0E0] dark:border-slate-800 rounded-lg p-5">
            <h3 className="font-semibold text-lg mb-4 text-[#212121] dark:text-slate-100">{t("settings_booking_limits")}</h3>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#757575] dark:text-slate-400">{t("settings_max_per_day")}</label>
              <input
                type="number"
                min="1"
                className="w-full border border-[#E0E0E0] dark:border-slate-800 rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50"
                value={getValue('MAX_BOOKINGS_PER_DAY')}
                onChange={(e) => handleChange('MAX_BOOKINGS_PER_DAY', e.target.value)}
              />
              <p className="text-xs text-[#757575] dark:text-slate-400 mt-1">{getDesc('MAX_BOOKINGS_PER_DAY')}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <div className="border border-[#E0E0E0] dark:border-slate-800 rounded-lg p-5">
            <h3 className="font-semibold text-lg mb-4 text-[#212121] dark:text-slate-100">{t("settings_auto_cancel")}</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#757575] dark:text-slate-400">{t("settings_cancel_pending")}</label>
                <input
                  type="number"
                  min="1"
                  className="w-full border border-[#E0E0E0] dark:border-slate-800 rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50"
                  value={getValue('CANCEL_PENDING_HOURS')}
                  onChange={(e) => handleChange('CANCEL_PENDING_HOURS', e.target.value)}
                />
                <p className="text-xs text-[#757575] dark:text-slate-400 mt-1">{getDesc('CANCEL_PENDING_HOURS')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[#757575] dark:text-slate-400">{t("settings_no_show")}</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-[#E0E0E0] dark:border-slate-800 rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50"
                  value={getValue('NO_SHOW_MINUTES')}
                  onChange={(e) => handleChange('NO_SHOW_MINUTES', e.target.value)}
                />
                <p className="text-xs text-[#757575] dark:text-slate-400 mt-1">{getDesc('NO_SHOW_MINUTES')}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ui" className="space-y-4">
          <div className="border border-[#E0E0E0] dark:border-slate-800 rounded-lg p-5">
            <h3 className="font-semibold text-lg mb-4 text-[#212121] dark:text-slate-100">{t("settings_ui_personalize")}</h3>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#757575] dark:text-slate-400">{t("settings_default_lang")}</label>
              <select
                className="w-full border border-[#E0E0E0] dark:border-slate-800 rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50"
                value={getValue('DEFAULT_LANGUAGE')}
                onChange={(e) => handleChange('DEFAULT_LANGUAGE', e.target.value)}
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
              <p className="text-xs text-[#757575] dark:text-slate-400 mt-1">{getDesc('DEFAULT_LANGUAGE')}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="border border-[#E0E0E0] dark:border-slate-800 rounded-lg p-5 bg-slate-50 dark:bg-slate-900">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-full dark:bg-blue-900/50 dark:text-blue-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-slate-800 dark:text-white">{t("mfa_title")}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
                  Bảo vệ tài khoản quản trị của bạn khỏi các cuộc tấn công bằng cách yêu cầu mã xác thực 6 số từ điện thoại mỗi khi đăng nhập.
                </p>
                
                {isMfaEnabled ? (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-xl max-w-md">
                    <p className="font-bold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5" /> {t("mfa_active")}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-500 mb-4">
                      {t("mfa_active_desc")}
                    </p>
                    <button
                      onClick={handleDisableMfa}
                      disabled={setupLoading}
                      className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-md font-medium transition-colors text-sm"
                    >
                      {setupLoading ? t("mfa_processing") : t("mfa_disable_btn")}
                    </button>
                  </div>
                ) : !qrCodeUrl ? (
                  <button
                    onClick={handleGenerateMfa}
                    disabled={setupLoading}
                    className="bg-[#1E5FA5] dark:bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-[#0F172A] transition-colors"
                  >
                    {setupLoading ? t("mfa_processing") : t("mfa_setup_btn")}
                  </button>
                ) : (
                  <div className="mt-4 p-4 border border-blue-200 bg-white dark:bg-slate-800 dark:border-slate-700 rounded-xl max-w-md shadow-sm dark:shadow-slate-900/50">
                    <p className="font-medium text-slate-800 dark:text-slate-200 mb-2">{t("mfa_step1")}</p>
                    <div className="bg-white dark:bg-slate-900 p-2 w-max rounded-lg mb-4 border border-slate-200">
                      <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40" />
                    </div>
                    
                    <p className="font-medium text-slate-800 dark:text-slate-200 mb-2">{t("mfa_step2")}</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="000000"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                        className="flex-1 border border-[#E0E0E0] dark:border-slate-600 rounded-md p-2 text-center text-xl tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50"
                      />
                      <button
                        onClick={handleVerifyMfaSetup}
                        disabled={setupLoading || mfaCode.length !== 6}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 rounded-md font-medium transition-colors"
                      >
                        Xác nhận
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <div className="border border-[#C62828] rounded-lg p-5 bg-[#FFEBEE]">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[#C62828] text-white rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-[#C62828]">{t("settings_maintenance_mode")}</h3>
                <p className="text-sm text-[#C62828] mt-1 mb-4">
                  {t("settings_maintenance_desc")}
                </p>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={getValue('MAINTENANCE_MODE') === 'true'}
                    onChange={(e) => handleChange('MAINTENANCE_MODE', e.target.checked ? 'true' : 'false')}
                  />
                  <div className="w-14 h-7 bg-[#E0E0E0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-900 after:border-gray-300 dark:border-slate-600 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#C62828]"></div>
                  <span className="ml-3 text-sm font-medium text-[#C62828]">
                    {getValue('MAINTENANCE_MODE') === 'true' ? t("settings_on") : t("settings_off")}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
