import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newDevice: any;
  setNewDevice: any;
  rooms: any[];
}

export function AddDeviceModal({
  isOpen,
  onClose,
  onSubmit,
  newDevice,
  setNewDevice,
  rooms,
}: AddDeviceModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl dark:shadow-slate-900/50 w-full max-w-md p-6 border border-white/20 dark:border-slate-700/50 animate-in zoom-in-95 duration-200">
        <h2 className="text-[20px] font-bold text-[#212121] dark:text-slate-100 mb-4">
          {t('add_new_device')}
        </h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
              {t('device_name')}
            </label>
            <input
              required
              type="text"
              value={newDevice.name}
              onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
              className="w-full px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-[#E0E0E0] dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
              {t('serial_number_label')}
            </label>
            <input
              required
              type="text"
              value={newDevice.serial_number}
              onChange={(e) => setNewDevice({ ...newDevice, serial_number: e.target.value })}
              className="w-full px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-[#E0E0E0] dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
              {t('lab_room')}
            </label>
            <select
              value={newDevice.room_id}
              onChange={(e) => setNewDevice({ ...newDevice, room_id: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-[#E0E0E0] dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value={0}>{t('no_room_assigned_option')}</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                Ngày mua
              </label>
              <input
                type="date"
                value={(newDevice as any).purchase_date || ''}
                onChange={(e) => setNewDevice({ ...newDevice, purchase_date: e.target.value } as any)}
                className="w-full px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-[#E0E0E0] dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                Giá trị (VNĐ)
              </label>
              <input
                type="number"
                min="0"
                value={(newDevice as any).value || ''}
                onChange={(e) => setNewDevice({ ...newDevice, value: e.target.value } as any)}
                className="w-full px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-[#E0E0E0] dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                Chu kỳ bảo trì (tháng)
              </label>
              <input
                type="number"
                min="1"
                value={(newDevice as any).maintenance_interval_months || ''}
                onChange={(e) => setNewDevice({ ...newDevice, maintenance_interval_months: e.target.value } as any)}
                className="w-full px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-[#E0E0E0] dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                Bảo trì lần cuối
              </label>
              <input
                type="date"
                value={(newDevice as any).last_maintenance || ''}
                onChange={(e) => setNewDevice({ ...newDevice, last_maintenance: e.target.value } as any)}
                className="w-full px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-[#E0E0E0] dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
              Ảnh (Tùy chọn)
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2 bg-white/80 dark:bg-slate-900/80 border border-[#E0E0E0] dark:border-slate-800 rounded-lg hover:bg-[#F5F5F5] dark:hover:bg-slate-800 transition-colors text-[13px] font-medium text-[#757575] dark:text-slate-300 w-fit">
                <Upload className="w-4 h-4" /> Chọn ảnh
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const toastId = toast.loading('Đang tải ảnh lên...');
                      const { uploadService } = await import('../../services');
                      const res = await uploadService.uploadFile(file);
                      setNewDevice({ ...newDevice, image_url: res.data.url } as any);
                      toast.success('Tải ảnh lên thành công', { id: toastId });
                    } catch (error) {
                      toast.error('Lỗi tải ảnh lên');
                    }
                  }}
                />
              </label>
              {(newDevice as any).image_url && (
                <img
                  src={`http://localhost:3000${(newDevice as any).image_url}`}
                  alt="Preview"
                  className="h-10 w-10 object-cover rounded"
                />
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[14px] font-medium text-[#757575] dark:text-slate-400 hover:bg-[#F5F5F5] dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-[14px] font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5"
            >
              {t('save_device')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
