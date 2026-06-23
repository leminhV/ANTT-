import { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileText,
  FileClock,
  DatabaseBackup,
  MessageSquare,
  QrCode,
  X,
  Monitor,
} from 'lucide-react';
import { equipmentService, roomService } from '../../services';
import { StatMini } from '../../components/ui/StatMini';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { StatusBadge } from '../../components/equipment/StatusBadge';
import { AddDeviceModal } from '../../components/equipment/AddDeviceModal';
import { EditDeviceModal } from '../../components/equipment/EditDeviceModal';
import { DeviceDetailModal } from '../../components/equipment/DeviceDetailModal';

// --- B. Khai báo TypeScript chặt chẽ (Thay thế any) ---
export interface Room {
  id: number;
  name: string;
}

export interface Device {
  id: number;
  name: string;
  serial_number: string;
  room_id: number;
  status: string;
  room?: { name: string };
  created_at?: string;
  last_maintenance?: string;
  image_url?: string;
  purchase_date?: string;
  value?: number;
  maintenance_interval_months?: number;
}

export function DeviceManagement() {
  const { t } = useTranslation();

  const [devices, setDevices] = useState<Device[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [isEditingDevice, setIsEditingDevice] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [newDevice, setNewDevice] = useState({
    name: '',
    serial_number: '',
    room_id: 0,
    status: 'AVAILABLE',
    image_url: '',
    purchase_date: '',
    value: 0,
    maintenance_interval_months: 6,
    last_maintenance: '',
  });
  const [editingDevice, setEditingDevice] = useState({
    id: 0,
    name: '',
    serial_number: '',
    room_id: 0,
    status: 'AVAILABLE',
    image_url: '',
    last_maintenance: '',
  });
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [qrDevice, setQrDevice] = useState<Device | null>(null);

  const [rooms, setRooms] = useState<Room[]>([]);

  const currentUserStr = localStorage.getItem('user');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await equipmentService.getAll();
      setDevices(res.data || []);
    } catch (error: unknown) {
      const err = error as any;
      const msg = err.response?.data?.message || t('load_devices_error');
      setFetchError(Array.isArray(msg) ? msg[0] : msg);
      setDevices([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchRooms() {
    try {
      const res = await roomService.getAll();
      setRooms(res.data || []);
      if (res.data?.length > 0 && newDevice.room_id === 0) {
        setNewDevice({ ...newDevice, room_id: res.data[0].id });
      }
    } catch (e) {
      // apiClient.ts sẽ tự hiển thị toast
    }
  }

  const openAddModal = () => {
    fetchRooms();
    setIsAddingDevice(true);
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newDevice.room_id === 0) {
      toast.error('Vui lòng tạo ít nhất 1 Phòng Lab trước khi lưu Thiết bị.');
      return;
    }
    try {
      const payload: any = {
        name: newDevice.name,
        serial_number: newDevice.serial_number,
        room_id: newDevice.room_id,
        status: newDevice.status,
        image_url: newDevice.image_url,
      };
      if ((newDevice as any).purchase_date) payload.purchase_date = new Date((newDevice as any).purchase_date).toISOString();
      if ((newDevice as any).value) payload.value = Number((newDevice as any).value);
      if ((newDevice as any).maintenance_interval_months) payload.maintenance_interval_months = Number((newDevice as any).maintenance_interval_months);
      if ((newDevice as any).last_maintenance) payload.last_maintenance = new Date((newDevice as any).last_maintenance).toISOString();

      await equipmentService.create(payload);
      toast.success(t('add_device_success'));
      setIsAddingDevice(false);
      setNewDevice({ 
        name: '', serial_number: '', room_id: 0, status: 'AVAILABLE', image_url: '',
        purchase_date: '', value: 0, maintenance_interval_months: 6, last_maintenance: '' 
      } as any);
      fetchData();
    } catch (error: unknown) {
      const err = error as any;
      const msg = err.response?.data?.message || t('add_device_failed');
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  const handleUpdateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDevice.room_id === 0) {
      toast.error('Vui lòng tạo ít nhất 1 Phòng Lab trước khi lưu Thiết bị.');
      return;
    }
    try {
      await equipmentService.update(editingDevice.id.toString(), {
        name: editingDevice.name,
        serial_number: editingDevice.serial_number,
        room_id: editingDevice.room_id,
        status: editingDevice.status,
        image_url: editingDevice.image_url,
        purchase_date: (editingDevice as any).purchase_date ? new Date((editingDevice as any).purchase_date).toISOString() : undefined,
        value: (editingDevice as any).value ? Number((editingDevice as any).value) : undefined,
        maintenance_interval_months: (editingDevice as any).maintenance_interval_months ? Number((editingDevice as any).maintenance_interval_months) : undefined,
        last_maintenance: editingDevice.last_maintenance ? new Date(editingDevice.last_maintenance).toISOString() : undefined,
      });
      toast.success(t('update_device_success'));
      setIsEditingDevice(false);
      fetchData();
    } catch (error: unknown) {
      const err = error as any;
      const msg = err.response?.data?.message || t('update_device_failed');
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  const executeDelete = async () => {
    if (deleteConfirmId) {
      try {
        await equipmentService.delete(deleteConfirmId.toString());
        setDevices(devices.filter((d) => d.id !== deleteConfirmId));
        toast.success(t('delete_device_success'));
      } catch (error: unknown) {
        const err = error as any;
        const msg = err.response?.data?.message || t('delete_device_failed');
        toast.error(Array.isArray(msg) ? msg[0] : msg);
      }
      setDeleteConfirmId(null);
    }
  };

  // --- A. Tối ưu Hiệu năng Tìm kiếm bằng useMemo ---
  const filteredDevices = useMemo(() => {
    return devices.filter(
      (d) =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [devices, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: devices.length,
      available: devices.filter((d) => d.status === 'AVAILABLE').length,
      inUse: devices.filter((d) => d.status === 'IN_USE').length,
      maintenance: devices.filter((d) => d.status === 'MAINTENANCE').length,
      broken: devices.filter((d) => d.status === 'BROKEN').length,
    };
  }, [devices]);

  return (
    <div className="max-w-[1200px] w-full mx-auto animate-in fade-in duration-300 h-full flex flex-col space-y-4">
      {/* Header + Stats */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div>
            <h2 className="text-[20px] font-bold text-[#0F172A] dark:text-slate-100 flex items-center gap-2">
              <Monitor className="w-6 h-6 text-indigo-500" />
              {t('manage_devices')}
            </h2>
            <p className="text-[13px] text-[#64748B] dark:text-slate-400 mt-1">
              Quản lý danh sách thiết bị, phân bổ phòng và tình trạng hoạt động.
            </p>
          </div>
          <button
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 text-[14px]"
            onClick={openAddModal}
          >
            <Plus className="w-4 h-4" />
            {t('add_new_device')}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatMini
            label={t('total_devices')}
            value={stats.total}
            icon={<FileText className="w-5 h-5" />}
            color="text-blue-600"
            bgColor="bg-blue-600"
          />
          <StatMini
            label={t('status_available')}
            value={stats.available}
            icon={<CheckCircle2 className="w-5 h-5" />}
            color="text-green-600"
            bgColor="bg-green-600"
          />
          <StatMini
            label={t('status_in_use')}
            value={stats.inUse}
            icon={<FileClock className="w-5 h-5" />}
            color="text-indigo-600"
            bgColor="bg-indigo-600"
          />
          <StatMini
            label={t('status_maintenance')}
            value={stats.maintenance}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="text-amber-500"
            bgColor="bg-amber-500"
          />
          <StatMini
            label={t('status_broken')}
            value={stats.broken}
            icon={<ShieldAlert className="w-5 h-5" />}
            color="text-red-600"
            bgColor="bg-red-600"
          />
        </div>
      </div>

      {/* Error State */}
      {fetchError && (
        <div className="bg-[#FDEDED] dark:bg-red-900/30 border border-[#C62828] text-[#C62828] p-4 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="text-[14px] font-medium">{fetchError}</span>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-1 text-[13px] bg-white dark:bg-slate-900 px-3 py-1.5 rounded border border-[#C62828] hover:bg-red-50"
          >
            <RefreshCw className="w-4 h-4" /> {t('retry')}
          </button>
        </div>
      )}

      {/* Table Area */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm dark:shadow-slate-900/50 border border-[#E0E0E0] dark:border-slate-800 flex flex-col flex-1 min-h-0">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#E0E0E0]/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-md flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1 items-center">
            <div className="relative w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#757575] dark:text-slate-400" />
              <input
                type="text"
                placeholder={t('search_device_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-[#E0E0E0] dark:border-slate-800 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          <button
            onClick={fetchData}
            className="p-2 text-[#757575] dark:text-slate-400 hover:text-[#1E5FA5] dark:text-blue-400 hover:bg-white dark:bg-slate-900 rounded border border-transparent hover:border-[#E0E0E0] dark:border-slate-800 transition-colors bg-white dark:bg-slate-900"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-[#E0E0E0]/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm sticky top-0 z-10">
                <th className="px-4 py-3 text-[13px] font-semibold text-[#757575] dark:text-slate-400">
                  {t('device_id_name')}
                </th>
                <th className="px-4 py-3 text-[13px] font-semibold text-[#757575] dark:text-slate-400">
                  {t('serial_number')}
                </th>
                <th className="px-4 py-3 text-[13px] font-semibold text-[#757575] dark:text-slate-400">
                  {t('lab_room')}
                </th>
                <th className="px-4 py-3 text-[13px] font-semibold text-[#757575] dark:text-slate-400">
                  Giá trị
                </th>
                <th className="px-4 py-3 text-[13px] font-semibold text-[#757575] dark:text-slate-400">
                  {t('status')}
                </th>
                <th className="px-4 py-3 text-[13px] font-semibold text-[#757575] dark:text-slate-400">
                  {t('last_maintenance')}
                </th>
                <th className="px-4 py-3 text-[13px] font-semibold text-[#757575] dark:text-slate-400 text-right">
                  {t('action')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0] dark:divide-slate-800">
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={`skel-${i}`} className="animate-pulse bg-white dark:bg-slate-900">
                    <td className="px-4 py-4">
                      <div className="h-4 bg-[#E0E0E0] rounded w-32 mb-1"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-[#E0E0E0] rounded w-20"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-[#E0E0E0] rounded w-24"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-5 bg-[#E0E0E0] rounded w-16"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-[#E0E0E0] rounded w-20"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-6 bg-[#E0E0E0] rounded w-16 ml-auto"></div>
                    </td>
                  </tr>
                ))}

              {!isLoading &&
                filteredDevices.map((dev, i) => (
                  <tr
                    key={i}
                    className="hover:bg-[#F5F5F5] dark:hover:bg-slate-800 dark:bg-slate-800/50 bg-white dark:bg-slate-900 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="text-[14px] font-medium text-[#212121] dark:text-slate-100">
                        {dev.name}
                      </div>
                      <div className="text-[12px] text-[#757575] dark:text-slate-400">
                        ID: {dev.id}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[#212121] dark:text-slate-100 font-mono">
                      {dev.serial_number}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[#212121] dark:text-slate-100">
                      {dev.room?.name || t('no_room_assigned')}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[#212121] dark:text-slate-100">
                      {(dev as any).value ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format((dev as any).value) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={dev.status} />
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[#212121] dark:text-slate-100">
                      {dev.last_maintenance
                        ? format(new Date(dev.last_maintenance), 'dd/MM/yyyy')
                        : t('never_maintained')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setQrDevice(dev);
                          }}
                          className="p-1.5 text-[#757575] dark:text-slate-400 hover:text-indigo-600 hover:bg-[#D6E4F7] dark:bg-blue-900/30 rounded"
                          title="Xem mã QR"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDevice(dev);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-1.5 text-[#757575] dark:text-slate-400 hover:text-[#1E5FA5] dark:text-blue-400 hover:bg-[#D6E4F7] dark:bg-blue-900/30 rounded"
                          title={t('comments_details')}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDevice({
                              id: dev.id,
                              name: dev.name,
                              serial_number: dev.serial_number,
                              room_id: dev.room_id || 0,
                              status: dev.status,
                              purchase_date: dev.purchase_date ? new Date(dev.purchase_date).toISOString().split('T')[0] : '',
                              value: dev.value || 0,
                              maintenance_interval_months: dev.maintenance_interval_months || 6,
                              last_maintenance: dev.last_maintenance ? new Date(dev.last_maintenance).toISOString().split('T')[0] : '',
                            } as any);
                            fetchRooms();
                            setIsEditingDevice(true);
                          }}
                          className="p-1.5 text-[#757575] dark:text-slate-400 hover:text-[#1E5FA5] dark:text-blue-400 hover:bg-[#D6E4F7] dark:bg-blue-900/30 rounded"
                          title={t('edit')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(dev.id);
                          }}
                          className="p-1.5 text-[#757575] dark:text-slate-400 hover:text-[#C62828] hover:bg-[#FDEDED] dark:bg-red-900/30 rounded"
                          title={t('delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {!isLoading && filteredDevices.length === 0 && !fetchError && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#757575] dark:text-slate-400">
                    <DatabaseBackup className="w-12 h-12 mx-auto mb-3 text-[#E0E0E0]" />
                    <p className="mb-4">{t('no_devices_found')}</p>
                    <button
                      onClick={openAddModal}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-[14px] transition-all shadow-lg shadow-blue-500/30 hover:-translate-y-0.5"
                    >
                      {t('add_device_now')}
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- C. Tách các Component Modal (Clean Code) --- */}
      <DeviceDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        selectedDevice={selectedDevice}
        currentUser={currentUser}
      />

      <AddDeviceModal
        isOpen={isAddingDevice}
        onClose={() => setIsAddingDevice(false)}
        onSubmit={handleAddDevice}
        newDevice={newDevice}
        setNewDevice={setNewDevice}
        rooms={rooms}
      />

      <EditDeviceModal
        isOpen={isEditingDevice}
        onClose={() => setIsEditingDevice(false)}
        onSubmit={handleUpdateDevice}
        editingDevice={editingDevice}
        setEditingDevice={setEditingDevice}
        rooms={rooms}
      />

      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        title={t('delete_device')}
        message={t('delete_device_confirm')}
        confirmText={t('delete_device')}
        isDestructive={true}
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {qrDevice && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-neutral-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-neutral-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-neutral-900 dark:text-slate-100 text-[15px]">
                Mã QR Định danh Thiết bị
              </h3>
              <button
                onClick={() => setQrDevice(null)}
                className="p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center space-y-4">
              <div className="text-center">
                <h4 className="font-bold text-neutral-800 dark:text-slate-200 text-[16px]">
                  {qrDevice.name}
                </h4>
                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                  S/N: {qrDevice.serial_number}
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-neutral-200 shadow-sm flex items-center justify-center">
                <QRCodeSVG
                  value={JSON.stringify({ id: qrDevice.id, type: 'equipment' })}
                  size={176}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center leading-normal">
                Mã QR này được dùng để dán lên thiết bị thực tế. Sinh viên có thể dùng chức năng
                quét QR trên điện thoại để Check-in/out nhanh khi mượn thiết bị này.
              </p>

              <div className="w-full flex gap-3">
                <button
                  onClick={() => setQrDevice(null)}
                  className="flex-1 py-2 text-[13px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-300 rounded-lg transition-colors text-center"
                >
                  Đóng
                </button>
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(JSON.stringify({ id: qrDevice.id, type: 'equipment' }))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 text-[13px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-center shadow-sm shadow-blue-500/10"
                >
                  Tải ảnh QR
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
