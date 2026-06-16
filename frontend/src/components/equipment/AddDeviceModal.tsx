import { useTranslation } from "react-i18next";

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newDevice: { name: string; serial_number: string; room_id: number; status: string };
  setNewDevice: (device: any) => void;
  rooms: any[];
}

export function AddDeviceModal({ isOpen, onClose, onSubmit, newDevice, setNewDevice, rooms }: AddDeviceModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg dark:shadow-slate-900/50 w-full max-w-md p-6">
        <h2 className="text-[20px] font-bold text-[#212121] dark:text-slate-100 mb-4">{t("add_new_device")}</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">{t("device_name")}</label>
            <input required type="text" value={newDevice.name} onChange={e => setNewDevice({...newDevice, name: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] dark:border-slate-800 rounded-md focus:outline-none focus:border-[#1E5FA5] dark:focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">{t("serial_number_label")}</label>
            <input required type="text" value={newDevice.serial_number} onChange={e => setNewDevice({...newDevice, serial_number: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] dark:border-slate-800 rounded-md focus:outline-none focus:border-[#1E5FA5] dark:focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">{t("lab_room")}</label>
            <select value={newDevice.room_id} onChange={e => setNewDevice({...newDevice, room_id: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-[#E0E0E0] dark:border-slate-800 rounded-md focus:outline-none focus:border-[#1E5FA5] dark:focus:border-blue-500">
              <option value={0}>{t("no_room_assigned_option")}</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[#757575] dark:text-slate-400 hover:bg-[#F5F5F5] dark:hover:bg-slate-800 dark:bg-slate-800/50 rounded-md transition-colors">{t("cancel")}</button>
            <button type="submit" className="px-4 py-2 bg-[#1E5FA5] dark:bg-blue-600 hover:bg-[#154a85] dark:hover:bg-blue-700 text-white rounded-md transition-colors">{t("save_device")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
