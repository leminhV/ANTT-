import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search, Edit2, Trash2, AlertCircle, RefreshCw, ShieldAlert, CheckCircle2, AlertTriangle, FileText, FileClock, DatabaseBackup, MessageSquare } from "lucide-react";
import { equipmentService, roomService } from "../../services";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { ConfirmModal } from "../../components/common/ConfirmModal";
import { StatusBadge } from "../../components/equipment/StatusBadge";
import { AddDeviceModal } from "../../components/equipment/AddDeviceModal";
import { EditDeviceModal } from "../../components/equipment/EditDeviceModal";
import { DeviceDetailModal } from "../../components/equipment/DeviceDetailModal";

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
}

export function DeviceManagement() {
  const { t } = useTranslation();

  const [devices, setDevices] = useState<Device[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [isEditingDevice, setIsEditingDevice] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const [newDevice, setNewDevice] = useState({ name: "", serial_number: "", room_id: 0, status: "AVAILABLE" });
  const [editingDevice, setEditingDevice] = useState({ id: 0, name: "", serial_number: "", room_id: 0, status: "AVAILABLE" });
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  
  const [rooms, setRooms] = useState<Room[]>([]);
  
  const currentUserStr = localStorage.getItem("user");
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
    } catch (error: any) {
      const msg = error.response?.data?.message || t("load_devices_error");
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
      toast.error("Vui lòng tạo ít nhất 1 Phòng Lab trước khi lưu Thiết bị.");
      return;
    }
    try {
      await equipmentService.create(newDevice);
      toast.success(t("add_device_success"));
      setIsAddingDevice(false);
      setNewDevice({ name: "", serial_number: "", room_id: 0, status: "AVAILABLE" });
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.message || t("add_device_failed");
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  const handleUpdateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDevice.room_id === 0) {
      toast.error("Vui lòng tạo ít nhất 1 Phòng Lab trước khi lưu Thiết bị.");
      return;
    }
    try {
      await equipmentService.update(editingDevice.id.toString(), {
        name: editingDevice.name,
        serial_number: editingDevice.serial_number,
        room_id: editingDevice.room_id,
        status: editingDevice.status
      });
      toast.success(t("update_device_success"));
      setIsEditingDevice(false);
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.message || t("update_device_failed");
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  const executeDelete = async () => {
    if (deleteConfirmId) {
      try {
        await equipmentService.delete(deleteConfirmId.toString());
        setDevices(devices.filter(d => d.id !== deleteConfirmId));
        toast.success(t("delete_device_success"));
      } catch (error: any) {
        const msg = error.response?.data?.message || t("delete_device_failed");
        toast.error(Array.isArray(msg) ? msg[0] : msg);
      }
      setDeleteConfirmId(null);
    }
  };

  // --- A. Tối ưu Hiệu năng Tìm kiếm bằng useMemo ---
  const filteredDevices = useMemo(() => {
    return devices.filter(d => 
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [devices, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: devices.length,
      available: devices.filter(d => d.status === 'AVAILABLE').length,
      inUse: devices.filter(d => d.status === 'IN_USE').length,
      maintenance: devices.filter(d => d.status === 'MAINTENANCE').length,
      broken: devices.filter(d => d.status === 'BROKEN').length,
    };
  }, [devices]);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-300 pb-8">
      {/* Header + Stats */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[24px] font-bold text-[#212121] dark:text-slate-100">{t("manage_devices")}</h1>
          <button
            className="flex items-center gap-2 bg-[#1E5FA5] dark:bg-blue-600 hover:bg-[#154a85] dark:hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors text-[14px]"
            onClick={openAddModal}
          >
            <Plus className="w-4 h-4" />
            {t("add_new_device")}
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatMini label={t("total_devices")} value={stats.total} icon={<FileText className="w-5 h-5" />} color="text-[#1E5FA5] dark:text-blue-400" />
          <StatMini label={t("status_available")} value={stats.available} icon={<CheckCircle2 className="w-5 h-5" />} color="text-[#2E7D32]" />
          <StatMini label={t("status_in_use")} value={stats.inUse} icon={<FileClock className="w-5 h-5" />} color="text-[#1E5FA5] dark:text-blue-400" />
          <StatMini label={t("status_maintenance")} value={stats.maintenance} icon={<AlertTriangle className="w-5 h-5" />} color="text-[#E65100]" />
          <StatMini label={t("status_broken")} value={stats.broken} icon={<ShieldAlert className="w-5 h-5" />} color="text-[#C62828]" />
        </div>
      </div>

      {/* Error State */}
      {fetchError && (
        <div className="bg-[#FDEDED] dark:bg-red-900/30 border border-[#C62828] text-[#C62828] p-4 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="text-[14px] font-medium">{fetchError}</span>
          </div>
          <button onClick={fetchData} className="flex items-center gap-1 text-[13px] bg-white dark:bg-slate-900 px-3 py-1.5 rounded border border-[#C62828] hover:bg-red-50">
            <RefreshCw className="w-4 h-4" /> {t("retry")}
          </button>
        </div>
      )}

      {/* Table Area */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm dark:shadow-slate-900/50 border border-[#E0E0E0] dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#E0E0E0] dark:border-slate-800 bg-[#F5F5F5] dark:bg-slate-800/50 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#757575] dark:text-slate-400" />
              <input 
                type="text" 
                placeholder={t("search_device_placeholder")} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-[#E0E0E0] dark:border-slate-800 rounded text-[14px] focus:outline-none focus:border-[#1E5FA5] dark:focus:border-blue-500"
              />
            </div>
          </div>
          <button onClick={fetchData} className="p-2 text-[#757575] dark:text-slate-400 hover:text-[#1E5FA5] dark:text-blue-400 hover:bg-white dark:bg-slate-900 rounded border border-transparent hover:border-[#E0E0E0] dark:border-slate-800 transition-colors bg-white dark:bg-slate-900">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-[#E0E0E0] dark:border-slate-800 bg-slate-50">
                <th className="px-4 py-3 text-[13px] font-semibold text-[#757575] dark:text-slate-400">{t("device_id_name")}</th>
                <th className="px-4 py-3 text-[13px] font-semibold text-[#757575] dark:text-slate-400">{t("serial_number")}</th>
                <th className="px-4 py-3 text-[13px] font-semibold text-[#757575] dark:text-slate-400">{t("lab_room")}</th>
                <th className="px-4 py-3 text-[13px] font-semibold text-[#757575] dark:text-slate-400">{t("status")}</th>
                <th className="px-4 py-3 text-[13px] font-semibold text-[#757575] dark:text-slate-400">{t("last_maintenance")}</th>
                <th className="px-4 py-3 text-[13px] font-semibold text-[#757575] dark:text-slate-400 text-right">{t("action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0] dark:divide-slate-800">
              
              {isLoading && Array.from({ length: 4 }).map((_, i) => (
                <tr key={`skel-${i}`} className="animate-pulse bg-white dark:bg-slate-900">
                  <td className="px-4 py-4"><div className="h-4 bg-[#E0E0E0] rounded w-32 mb-1"></div></td>
                  <td className="px-4 py-4"><div className="h-4 bg-[#E0E0E0] rounded w-20"></div></td>
                  <td className="px-4 py-4"><div className="h-4 bg-[#E0E0E0] rounded w-24"></div></td>
                  <td className="px-4 py-4"><div className="h-5 bg-[#E0E0E0] rounded w-16"></div></td>
                  <td className="px-4 py-4"><div className="h-4 bg-[#E0E0E0] rounded w-20"></div></td>
                  <td className="px-4 py-4"><div className="h-6 bg-[#E0E0E0] rounded w-16 ml-auto"></div></td>
                </tr>
              ))}

              {!isLoading && filteredDevices.map((dev, i) => (
                <tr key={i} className="hover:bg-[#F5F5F5] dark:hover:bg-slate-800 dark:bg-slate-800/50 bg-white dark:bg-slate-900 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-[14px] font-medium text-[#212121] dark:text-slate-100">{dev.name}</div>
                    <div className="text-[12px] text-[#757575] dark:text-slate-400">ID: {dev.id}</div>
                  </td>
                  <td className="px-4 py-3 text-[14px] text-[#212121] dark:text-slate-100 font-mono">{dev.serial_number}</td>
                  <td className="px-4 py-3 text-[14px] text-[#212121] dark:text-slate-100">{dev.room?.name || t("no_room_assigned")}</td>
                  <td className="px-4 py-3"><StatusBadge status={dev.status} /></td>
                  <td className="px-4 py-3 text-[14px] text-[#212121] dark:text-slate-100">
                    {dev.last_maintenance ? format(new Date(dev.last_maintenance), "dd/MM/yyyy") : t("never_maintained")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDevice(dev);
                        setIsDetailModalOpen(true);
                      }} className="p-1.5 text-[#757575] dark:text-slate-400 hover:text-[#1E5FA5] dark:text-blue-400 hover:bg-[#D6E4F7] dark:bg-blue-900/30 rounded" title={t("comments_details")}>
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { 
                        e.stopPropagation();
                        setEditingDevice({ id: dev.id, name: dev.name, serial_number: dev.serial_number, room_id: dev.room_id || 0, status: dev.status }); 
                        fetchRooms(); 
                        setIsEditingDevice(true); 
                      }} className="p-1.5 text-[#757575] dark:text-slate-400 hover:text-[#1E5FA5] dark:text-blue-400 hover:bg-[#D6E4F7] dark:bg-blue-900/30 rounded" title={t("edit")}>
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(dev.id);
                      }} className="p-1.5 text-[#757575] dark:text-slate-400 hover:text-[#C62828] hover:bg-[#FDEDED] dark:bg-red-900/30 rounded" title={t("delete")}>
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
                    <p className="mb-4">{t("no_devices_found")}</p>
                    <button onClick={openAddModal} className="px-4 py-2 bg-[#1E5FA5] dark:bg-blue-600 text-white rounded-md text-[14px]">{t("add_device_now")}</button>
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
        title={t("delete_device")}
        message={t("delete_device_confirm")}
        confirmText={t("delete_device")}
        isDestructive={true}
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}

function StatMini({ label, value, icon, color }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-[#E0E0E0] dark:border-slate-800 shadow-sm dark:shadow-slate-900/50 flex items-center justify-between">
      <div>
        <div className="text-[12px] text-[#757575] dark:text-slate-400 font-medium mb-1">{label}</div>
        <div className={`text-[20px] font-bold text-[#212121] dark:text-slate-100`}>{value}</div>
      </div>
      <div className={`p-2 rounded-md bg-[#F5F5F5] dark:bg-slate-800/50 ${color}`}>
        {icon}
      </div>
    </div>
  );
}
