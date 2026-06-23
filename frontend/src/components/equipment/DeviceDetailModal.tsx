import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { CommentSection } from '../common/CommentSection';
import { StatusBadge } from './StatusBadge';
import { FileText, Download, Activity, Wrench, CheckCircle } from 'lucide-react';

interface DeviceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDevice: {
    id: number;
    name: string;
    serial_number: string;
    status: string;
    room?: { name: string };
    created_at?: string;
    last_maintenance?: string;
  } | null;
  currentUser: { id: number; name: string; email: string; role: string; avatar?: string } | null;
}

export function DeviceDetailModal({
  isOpen,
  onClose,
  selectedDevice,
  currentUser,
}: DeviceDetailModalProps) {
  const { t } = useTranslation();

  if (!isOpen || !selectedDevice) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl dark:shadow-slate-900/50 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20 dark:border-slate-700/50 animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-[#E0E0E0]/50 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h2 className="text-[20px] font-bold text-[#212121] dark:text-slate-100">
              {t('device_details')} #{selectedDevice.id}
            </h2>
            <p className="text-[14px] text-[#757575] dark:text-slate-400 mt-1">
              {selectedDevice.name}
            </p>
            <button className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg text-sm font-medium transition-colors">
              <FileText className="w-4 h-4" />
              Tài liệu HDSD
              <Download className="w-3 h-3 ml-1" />
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-[#757575] dark:text-slate-400 hover:text-[#212121] dark:text-slate-100 p-2 bg-white/80 dark:bg-slate-900/80 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="space-y-4 mb-8">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[13px] text-[#757575] dark:text-slate-400">
                  {t('serial_num_label')}
                </span>
                <p className="text-[14px] font-medium text-[#212121] dark:text-slate-100 font-mono">
                  {selectedDevice.serial_number}
                </p>
              </div>
              <div>
                <span className="text-[13px] text-[#757575] dark:text-slate-400">
                  {t('status_label')}
                </span>
                <div>
                  <StatusBadge status={selectedDevice.status} />
                </div>
              </div>
              <div>
                <span className="text-[13px] text-[#757575] dark:text-slate-400">
                  {t('lab_room_label')}
                </span>
                <p className="text-[14px] font-medium text-[#212121] dark:text-slate-100">
                  {selectedDevice.room?.name || t('no_room_assigned')}
                </p>
              </div>
              <div>
                <span className="text-[13px] text-[#757575] dark:text-slate-400">
                  {t('date_added_label')}
                </span>
                <p className="text-[14px] font-medium text-[#212121] dark:text-slate-100">
                  {selectedDevice.created_at
                    ? format(new Date(selectedDevice.created_at), 'dd/MM/yyyy')
                    : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-[#E0E0E0] dark:border-slate-800 pt-6 mb-8">
            <h3 className="text-[16px] font-bold text-[#212121] dark:text-slate-100 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Vòng đời thiết bị (Lifecycle)
            </h3>
            <div className="relative border-l-2 border-blue-200 dark:border-blue-900 ml-3 space-y-6">
              <div className="relative pl-6">
                <span className="absolute left-[-9px] top-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                  <CheckCircle className="w-2 h-2 text-white" />
                </span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {selectedDevice.created_at ? format(new Date(selectedDevice.created_at), 'dd/MM/yyyy') : '01/01/2024'}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Mua mới và đưa vào sử dụng</p>
              </div>
              <div className="relative pl-6">
                <span className="absolute left-[-9px] top-1 w-4 h-4 rounded-full bg-amber-500 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                  <Wrench className="w-2 h-2 text-white" />
                </span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {selectedDevice.last_maintenance ? format(new Date(selectedDevice.last_maintenance), 'dd/MM/yyyy') : '15/05/2024'}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Bảo trì định kỳ lần cuối</p>
              </div>
              <div className="relative pl-6">
                <span className="absolute left-[-9px] top-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900"></span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Hiện tại</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Trạng thái: {selectedDevice.status === 'AVAILABLE' ? 'Đang rảnh' : selectedDevice.status === 'IN_USE' ? 'Đang được mượn' : 'Bảo trì/Hỏng'}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-[#E0E0E0] dark:border-slate-800 pt-6">
            <CommentSection
              entityType="equipment"
              entityId={selectedDevice.id}
              currentUser={currentUser}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
