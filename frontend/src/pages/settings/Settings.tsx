import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import apiClient from '../../services/apiClient';
import { toast } from 'react-hot-toast';
import { Save, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await apiClient.get('/settings');
      setSettings(res.data);
    } catch (error) {
      toast.error('Lỗi khi tải cấu hình');
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = settings.map((s) => ({ key: s.key, value: s.value }));
      await apiClient.put('/settings/bulk', { settings: payload });
      toast.success('Cập nhật cấu hình thành công');
    } catch (error) {
      toast.error('Lỗi khi lưu cấu hình');
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

  if (loading) return <div className="p-6">Đang tải cấu hình...</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E5FA5]">{t("settings_title")}</h1>
          <p className="text-[#757575] mt-1">{t("settings_desc")}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#1E5FA5] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-[#15467A] disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? t("settings_saving") : t("settings_save")}
        </button>
      </div>

      <Tabs defaultValue="booking" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-4 bg-[#F5F5F5] p-1 rounded-md">
          <TabsTrigger value="booking">{t("settings_tab_booking")}</TabsTrigger>
          <TabsTrigger value="automation">{t("settings_tab_auto")}</TabsTrigger>
          <TabsTrigger value="ui">{t("settings_tab_ui")}</TabsTrigger>
          <TabsTrigger value="maintenance">{t("settings_tab_maintenance")}</TabsTrigger>
        </TabsList>

        <TabsContent value="booking" className="space-y-4">
          <div className="border border-[#E0E0E0] rounded-lg p-5">
            <h3 className="font-semibold text-lg mb-4 text-[#212121]">{t("settings_booking_hours")}</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#757575]">{t("settings_start_hour")}</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  className="w-full border border-[#E0E0E0] rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1E5FA5]"
                  value={getValue('BOOKING_START_HOUR')}
                  onChange={(e) => handleChange('BOOKING_START_HOUR', e.target.value)}
                />
                <p className="text-xs text-[#757575] mt-1">{getDesc('BOOKING_START_HOUR')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[#757575]">{t("settings_end_hour")}</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  className="w-full border border-[#E0E0E0] rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1E5FA5]"
                  value={getValue('BOOKING_END_HOUR')}
                  onChange={(e) => handleChange('BOOKING_END_HOUR', e.target.value)}
                />
                <p className="text-xs text-[#757575] mt-1">{getDesc('BOOKING_END_HOUR')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#757575]">{t("MIN_BOOKING_MINUTES")}</label>
                <input
                  type="number"
                  min="1"
                  className="w-full border border-[#E0E0E0] rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1E5FA5]"
                  value={getValue('MIN_BOOKING_MINUTES')}
                  onChange={(e) => handleChange('MIN_BOOKING_MINUTES', e.target.value)}
                />
                <p className="text-xs text-[#757575] mt-1">{getDesc('MIN_BOOKING_MINUTES')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[#757575]">{t("MAX_BOOKING_MINUTES")}</label>
                <input
                  type="number"
                  min="1"
                  className="w-full border border-[#E0E0E0] rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1E5FA5]"
                  value={getValue('MAX_BOOKING_MINUTES')}
                  onChange={(e) => handleChange('MAX_BOOKING_MINUTES', e.target.value)}
                />
                <p className="text-xs text-[#757575] mt-1">{getDesc('MAX_BOOKING_MINUTES')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[#757575]">{t("BOOKING_BUFFER_MINUTES")}</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-[#E0E0E0] rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1E5FA5]"
                  value={getValue('BOOKING_BUFFER_MINUTES')}
                  onChange={(e) => handleChange('BOOKING_BUFFER_MINUTES', e.target.value)}
                />
                <p className="text-xs text-[#757575] mt-1">{getDesc('BOOKING_BUFFER_MINUTES')}</p>
              </div>
            </div>
          </div>

          <div className="border border-[#E0E0E0] rounded-lg p-5">
            <h3 className="font-semibold text-lg mb-4 text-[#212121]">{t("settings_booking_limits")}</h3>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#757575]">{t("settings_max_per_day")}</label>
              <input
                type="number"
                min="1"
                className="w-full border border-[#E0E0E0] rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1E5FA5]"
                value={getValue('MAX_BOOKINGS_PER_DAY')}
                onChange={(e) => handleChange('MAX_BOOKINGS_PER_DAY', e.target.value)}
              />
              <p className="text-xs text-[#757575] mt-1">{getDesc('MAX_BOOKINGS_PER_DAY')}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <div className="border border-[#E0E0E0] rounded-lg p-5">
            <h3 className="font-semibold text-lg mb-4 text-[#212121]">{t("settings_auto_cancel")}</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#757575]">{t("settings_cancel_pending")}</label>
                <input
                  type="number"
                  min="1"
                  className="w-full border border-[#E0E0E0] rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1E5FA5]"
                  value={getValue('CANCEL_PENDING_HOURS')}
                  onChange={(e) => handleChange('CANCEL_PENDING_HOURS', e.target.value)}
                />
                <p className="text-xs text-[#757575] mt-1">{getDesc('CANCEL_PENDING_HOURS')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[#757575]">{t("settings_no_show")}</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-[#E0E0E0] rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1E5FA5]"
                  value={getValue('NO_SHOW_MINUTES')}
                  onChange={(e) => handleChange('NO_SHOW_MINUTES', e.target.value)}
                />
                <p className="text-xs text-[#757575] mt-1">{getDesc('NO_SHOW_MINUTES')}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ui" className="space-y-4">
          <div className="border border-[#E0E0E0] rounded-lg p-5">
            <h3 className="font-semibold text-lg mb-4 text-[#212121]">{t("settings_ui_personalize")}</h3>
            <div>
              <label className="block text-sm font-medium mb-2 text-[#757575]">{t("settings_default_lang")}</label>
              <select
                className="w-full border border-[#E0E0E0] rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#1E5FA5]"
                value={getValue('DEFAULT_LANGUAGE')}
                onChange={(e) => handleChange('DEFAULT_LANGUAGE', e.target.value)}
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
              <p className="text-xs text-[#757575] mt-1">{getDesc('DEFAULT_LANGUAGE')}</p>
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
                  <div className="w-14 h-7 bg-[#E0E0E0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#C62828]"></div>
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
