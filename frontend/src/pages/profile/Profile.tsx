import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';
import {
  User as UserIcon, Camera, Phone, Building2,
  Shield, Bell, History, Mail, Clock, MonitorSmartphone, Key, ShieldCheck, Award
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { userService, authService } from '../../services';
import apiClient from '../../services/apiClient';
import toast from 'react-hot-toast';
import { useRef } from 'react';

export function Profile() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  
  const [phone, setPhone] = useState(user?.phone || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2FA states
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [isMfaEnabled, setIsMfaEnabled] = useState(!!user?.is_mfa_enabled);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn một file hình ảnh');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 5MB');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient.post('/api/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // After upload, update profile
      const newAvatarUrl = res.data.url;
      await userService.updateProfile({ avatar_url: newAvatarUrl });
      updateUser({ avatar_url: newAvatarUrl });
      toast.success('Tải ảnh đại diện thành công');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi tải ảnh lên');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveContact = async () => {
    try {
      setIsSaving(true);
      await userService.updateProfile({ phone, department });
      updateUser({ phone, department });
      toast.success('Cập nhật thông tin liên lạc thành công');
    } catch (error) {
      toast.error('Cập nhật thất bại. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateMfa = async () => {
    try {
      setSetupLoading(true);
      const response = await authService.generateMfa();
      setQrCodeUrl(response.data.qrCodeDataUrl);
    } catch (error: unknown) {
      const err = error as any;
      const msg = err.response?.data?.message || t('mfa_gen_error');
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleVerifyMfaSetup = async () => {
    try {
      setSetupLoading(true);
      if (!user) return;

      await authService.verifyMfa({ userId: user.id, code: mfaCode });
      toast.success(t('mfa_setup_success'));
      setQrCodeUrl(null);
      setMfaCode('');
      setIsMfaEnabled(true);
      updateUser({ is_mfa_enabled: true });
    } catch (error: unknown) {
      const err = error as any;
      toast.error(err.response?.data?.message || t('update_profile_failed'));
    } finally {
      setSetupLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!window.confirm(t('mfa_disable_confirm'))) return;
    try {
      setSetupLoading(true);
      await authService.disableMfa();
      toast.success(t('mfa_disable_success'));
      setIsMfaEnabled(false);
      updateUser({ is_mfa_enabled: false });
    } catch (error: unknown) {
      const err = error as any;
      const msg = err.response?.data?.message || t('mfa_disable_error');
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSetupLoading(false);
    }
  };
  
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [deviceAlerts, setDeviceAlerts] = useState(true);

  // Login history state
  const [loginHistory, setLoginHistory] = useState<any[]>([]);

  // Fetch login history on component mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await userService.getLoginHistory();
        setLoginHistory(res.data);
      } catch (error) {
        console.error('Failed to fetch login history', error);
      }
    };
    fetchHistory();
  }, []);

  const [skillBadges, setSkillBadges] = useState<any[]>([]);
  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const res = await apiClient.get('/api/skill-badges/my-badges');
        setSkillBadges(res.data);
      } catch (error) {
        console.error('Failed to fetch skill badges', error);
      }
    };
    if (user) fetchBadges();
  }, [user]);

  return (
    <div className="p-8 w-full">
      {/* Header Profile */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-8 border-b border-[#E0E0E0]/50 dark:border-slate-800/50 gap-6">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-10 h-10" />
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute -bottom-2 -right-2 bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl shadow-lg transition-all scale-90 group-hover:scale-100 disabled:opacity-50" 
              title="Đổi ảnh đại diện"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {user?.name || t('not_updated')}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-[#757575] dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm">
                <Shield className="w-4 h-4" />
                {user?.role === 'ADMIN' ? 'Quản trị viên' : user?.role === 'INSTRUCTOR' ? 'Giảng viên' : 'Sinh viên'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {t('status_normal')}
              </span>
            </div>
          </div>
        </div>
        {user?.role !== 'ADMIN' && (
          <div className="flex bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl items-center gap-4 border border-[#E0E0E0]/50 dark:border-slate-700/50 shadow-sm">
            <div className="bg-white dark:bg-white p-1.5 rounded-lg shadow-sm">
              <QRCodeSVG value={user?.email || 'user'} size={60} />
            </div>
            <div>
              <p className="text-[15px] font-bold text-[#212121] dark:text-slate-200">{t('qr_identity')}</p>
              <p className="text-[13px] text-[#757575] dark:text-slate-400 mt-1">{t('qr_desc')}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-slate-50/50 dark:bg-slate-800/20 border border-[#E0E0E0]/50 dark:border-slate-700/50 rounded-2xl p-6">
            <h3 className="font-bold text-[#212121] dark:text-slate-100 mb-5 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-indigo-500" />
              {t('contact_info')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-[#757575] dark:text-slate-500 uppercase tracking-wider">{t('email')}</label>
                <div className="flex items-center gap-3 mt-1.5 text-[#212121] dark:text-slate-300 font-medium text-[15px]">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {user?.email || 'N/A'}
                </div>
              </div>
              <div className="pt-3 border-t border-[#E0E0E0]/50 dark:border-slate-700/50">
                <label className="text-[11px] font-bold text-[#757575] dark:text-slate-500 uppercase tracking-wider">{t('phone_number')}</label>
                <div className="flex items-center gap-3 mt-1.5">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <input type="text" placeholder={t('add_phone')} className="bg-transparent border-none p-0 h-auto text-[15px] font-medium text-[#212121] dark:text-slate-300 focus:ring-0 w-full placeholder:text-slate-300 dark:placeholder:text-slate-600" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <div className="pt-3 border-t border-[#E0E0E0]/50 dark:border-slate-700/50">
                <label className="text-[11px] font-bold text-[#757575] dark:text-slate-500 uppercase tracking-wider">{t('department_class')}</label>
                <div className="flex items-center gap-3 mt-1.5">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <input type="text" placeholder={t('add_department')} className="bg-transparent border-none p-0 h-auto text-[15px] font-medium text-[#212121] dark:text-slate-300 focus:ring-0 w-full placeholder:text-slate-300 dark:placeholder:text-slate-600" value={department} onChange={(e) => setDepartment(e.target.value)} />
                </div>
              </div>
              {user?.role === 'STUDENT' && (
                <div className="pt-3 border-t border-[#E0E0E0]/50 dark:border-slate-700/50">
                  <label className="text-[11px] font-bold text-[#757575] dark:text-slate-500 uppercase tracking-wider">{t('trust_score')}</label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    <span className="text-[16px] font-bold text-emerald-600 dark:text-emerald-400">
                      {user?.trust_score ?? 100} / 100
                    </span>
                  </div>
                </div>
              )}
            </div>
            <button onClick={handleSaveContact} disabled={isSaving} className="w-full mt-6 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 py-2.5 rounded-xl font-bold transition-colors disabled:opacity-50">
              {isSaving ? t('saving') : t('save_changes')}
            </button>
          </div>

          {user?.role === 'ADMIN' ? (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-indigo-900 dark:text-indigo-100 mb-5 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-500" />
                {t('admin_privileges')}
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-indigo-800 dark:text-indigo-200 text-[14px] font-medium bg-white dark:bg-indigo-900/40 p-3 rounded-xl shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span> 
                  {t('admin_priv_db')}
                </div>
                <div className="flex items-center gap-3 text-indigo-800 dark:text-indigo-200 text-[14px] font-medium bg-white dark:bg-indigo-900/40 p-3 rounded-xl shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span> 
                  {t('admin_priv_users')}
                </div>
                <div className="flex items-center gap-3 text-indigo-800 dark:text-indigo-200 text-[14px] font-medium bg-white dark:bg-indigo-900/40 p-3 rounded-xl shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span> 
                  {t('admin_priv_labs')}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50/50 dark:bg-slate-800/20 border border-[#E0E0E0]/50 dark:border-slate-700/50 rounded-2xl p-6">
              <h3 className="font-bold text-[#212121] dark:text-slate-100 mb-5 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-500" />
                {t('skill_badges')}
              </h3>
              {skillBadges.length === 0 ? (
                <div className="text-center p-4 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                  <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">{t('no_badges')}</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {skillBadges.map((userBadge: any) => (
                    <div key={userBadge.id} className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 w-full">
                      <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
                        <img src={userBadge.badge?.icon_url || 'https://cdn-icons-png.flaticon.com/512/2874/2874310.png'} className="w-6 h-6 object-contain" alt="badge" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate">{userBadge.badge?.name}</div>
                        <div className="text-[11px] text-slate-500">{t('earned_date')} {new Date(userBadge.earned_at).toLocaleDateString('vi-VN')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="bg-slate-50/50 dark:bg-slate-800/20 border border-[#E0E0E0]/50 dark:border-slate-700/50 rounded-2xl p-6">
            <h3 className="font-bold text-[#212121] dark:text-slate-100 mb-5 flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-500" />
              {t('notification_options')}
            </h3>
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-[14px] text-[#212121] dark:text-slate-200">{t('email_booking_reminder')}</p>
                  <p className="text-[12px] text-[#757575] dark:text-slate-400 mt-0.5 leading-relaxed">{t('email_booking_reminder_desc')}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" className="sr-only peer" checked={emailNotifications} onChange={(e) => setEmailNotifications(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-[14px] text-[#212121] dark:text-slate-200">{t('device_alert')}</p>
                  <p className="text-[12px] text-[#757575] dark:text-slate-400 mt-0.5 leading-relaxed">{t('device_alert_desc')}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" className="sr-only peer" checked={deviceAlerts} onChange={(e) => setDeviceAlerts(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-slate-50/50 dark:bg-slate-800/20 border border-[#E0E0E0]/50 dark:border-slate-700/50 rounded-2xl p-6">
            <h3 className="font-bold text-[#212121] dark:text-slate-100 mb-6 flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-500" />
              {t('change_password')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-[13px] font-bold mb-2 text-[#757575] dark:text-slate-400">
                  {t('current_password')}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-white dark:bg-slate-900 border border-[#E0E0E0] dark:border-slate-700 rounded-xl p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold mb-2 text-[#757575] dark:text-slate-400">
                  {t('new_password')}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-white dark:bg-slate-900 border border-[#E0E0E0] dark:border-slate-700 rounded-xl p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold mb-2 text-[#757575] dark:text-slate-400">
                  {t('confirm_new_password')}
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-white dark:bg-slate-900 border border-[#E0E0E0] dark:border-slate-700 rounded-xl p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/30">
                {t('update_password')}
              </button>
            </div>
          </div>

          <div className="bg-slate-50/50 dark:bg-slate-800/20 border border-[#E0E0E0]/50 dark:border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-full dark:bg-blue-900/50 dark:text-blue-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-slate-800 dark:text-white">
                  {t('two_factor_auth')}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
                  Bảo vệ tài khoản của bạn khỏi các cuộc tấn công bằng cách yêu cầu mã xác
                  thực 6 số từ điện thoại mỗi khi đăng nhập.
                </p>

                {isMfaEnabled ? (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-xl max-w-md">
                    <p className="font-bold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5" /> Đã bật bảo mật 2 lớp
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-500 mb-4">
                      Tài khoản của bạn hiện đang được bảo vệ an toàn.
                    </p>
                    <button
                      onClick={handleDisableMfa}
                      disabled={setupLoading}
                      className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-md font-medium transition-colors text-sm"
                    >
                      {setupLoading ? 'Đang xử lý...' : 'Tắt bảo mật 2 lớp'}
                    </button>
                  </div>
                ) : !qrCodeUrl ? (
                  <button
                    onClick={handleGenerateMfa}
                    disabled={setupLoading}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl font-bold transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5"
                  >
                    {setupLoading ? 'Đang xử lý...' : '{t('setup_2fa')}'}
                  </button>
                ) : (
                  <div className="mt-4 p-4 border border-blue-200 bg-white dark:bg-slate-800 dark:border-slate-700 rounded-xl max-w-md shadow-sm dark:shadow-slate-900/50">
                    <p className="font-medium text-slate-800 dark:text-slate-200 mb-2">
                      1. Quét mã QR bằng ứng dụng Authenticator
                    </p>
                    <div className="bg-white dark:bg-slate-900 p-2 w-max rounded-lg mb-4 border border-slate-200">
                      <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40" />
                    </div>

                    <p className="font-medium text-slate-800 dark:text-slate-200 mb-2">
                      2. Nhập mã xác nhận 6 số
                    </p>
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
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 rounded-xl font-bold transition-all duration-300 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                      >
                        Xác nhận
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-50/50 dark:bg-slate-800/20 border border-[#E0E0E0]/50 dark:border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-[#E0E0E0]/50 dark:border-slate-700/50">
              <h3 className="font-bold text-[#212121] dark:text-slate-100 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500" />
                {t('login_history_activity')}
              </h3>
            </div>
            <div className="overflow-x-auto max-h-[250px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 dark:bg-slate-900 text-[#757575] dark:text-slate-400 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 font-bold">{t('time')}</th>
                    <th className="px-6 py-4 font-bold">{t('device')}</th>
                    <th className="px-6 py-4 font-bold">{t('location_ip')}</th>
                    <th className="px-6 py-4 font-bold">{t('status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E0E0E0]/50 dark:divide-slate-700/50">
                  {loginHistory.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-100/30 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-[#212121] dark:text-slate-300 font-medium">
                          <Clock className="w-4 h-4 text-slate-400" />
                          {new Date(log.created_at).toLocaleString('vi-VN')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-[#757575] dark:text-slate-400">
                          <MonitorSmartphone className="w-4 h-4 text-slate-400" />
                          {log.device}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#757575] dark:text-slate-400">
                        {log.location ? `${log.location} (${log.ip_address})` : log.ip_address}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${log.status.includes('Thành công') ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {loginHistory.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        {t('no_data')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
