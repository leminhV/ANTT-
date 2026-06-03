import { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, AlertCircle, RefreshCw, ShieldAlert, CheckCircle2, AlertTriangle, FileText, FileClock } from "lucide-react";
import { equipmentService, roomService } from "../../services";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { ConfirmModal } from "../../components/common/ConfirmModal";
import { CommentSection } from "../../components/common/CommentSection";
import { DatabaseBackup, MessageSquare } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-[#E8F5E9] text-[#2E7D32]'; // Khả dụng
      case 'IN_USE': return 'bg-[#D6E4F7] text-[#1E5FA5]'; // Đang dùng
      case 'MAINTENANCE': return 'bg-[#FFF3E0] text-[#E65100]'; // Bảo trì
      case 'BROKEN': return 'bg-[#FDEDED] text-[#C62828]'; // Hỏng
      default: return 'bg-[#F5F5F5] text-[#757575]';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'Khả dụng';
      case 'IN_USE': return 'Đang dùng';
      case 'MAINTENANCE': return 'Bảo trì';
      case 'BROKEN': return 'Hỏng hóc';
      default: return status;
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-[12px] font-medium ${getBadgeStyle(status)}`}>
      {getStatusText(status)}
    </span>
  );
}

export function DeviceManagement() {
  const [devices, setDevices] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [isEditingDevice, setIsEditingDevice] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: "", serial_number: "", room_id: 0, status: "AVAILABLE" });
  const [editingDevice, setEditingDevice] = useState({ id: 0, name: "", serial_number: "", room_id: 0, status: "AVAILABLE" });
  const [rooms, setRooms] = useState<any[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
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
    } catch {
      setFetchError("Lỗi máy chủ (500). Không thể tải danh sách thiết bị.");
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
      // apiClient.ts sẽ hiển thị toast lỗi chung
    }
  }

  const openAddModal = () => {
    fetchRooms();
    setIsAddingDevice(true);
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await equipmentService.create(newDevice);
      toast.success("Thêm thiết bị thành công!");
      setIsAddingDevice(false);
      setNewDevice({ name: "", serial_number: "", room_id: rooms[0]?.id || 0, status: "AVAILABLE" });
      fetchData();
    } catch {
      // toast handles it
    }
  };

  const handleUpdateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await equipmentService.update(editingDevice.id.toString(), {
        name: editingDevice.name,
        serial_number: editingDevice.serial_number,
        room_id: editingDevice.room_id,
        status: editingDevice.status
      });
      toast.success("Cập nhật thiết bị thành công!");
      setIsEditingDevice(false);
      fetchData();
    } catch {
      // toast handles it
    }
  };

  const executeDelete = async () => {
    if (deleteConfirmId) {
      try {
        await equipmentService.delete(deleteConfirmId.toString());
        setDevices(devices.filter(d => d.id !== deleteConfirmId));
        toast.success("Xóa thiết bị thành công!");
      } catch (error) {
        // apiClient.ts sẽ hiển thị toast lỗi chung
      }
      setDeleteConfirmId(null);
    }
  };

  const filteredDevices = devices.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: devices.length,
    available: devices.filter(d => d.status === 'AVAILABLE').length,
    inUse: devices.filter(d => d.status === 'IN_USE').length,
    maintenance: devices.filter(d => d.status === 'MAINTENANCE').length,
    broken: devices.filter(d => d.status === 'BROKEN').length,
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-300 pb-8">
      {/* Header + Stats */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[24px] font-bold text-[#212121]">Quản lý Thiết bị</h1>
          <button
            className="flex items-center gap-2 bg-[#1E5FA5] hover:bg-[#154a85] text-white px-4 py-2 rounded-md font-medium transition-colors text-[14px]"
            onClick={openAddModal}
          >
            <Plus className="w-4 h-4" />
            Thêm thiết bị mới
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatMini label="Tổng thiết bị" value={stats.total} icon={<FileText className="w-5 h-5" />} color="text-[#1E5FA5]" />
          <StatMini label="Khả dụng" value={stats.available} icon={<CheckCircle2 className="w-5 h-5" />} color="text-[#2E7D32]" />
          <StatMini label="Đang dùng" value={stats.inUse} icon={<FileClock className="w-5 h-5" />} color="text-[#1E5FA5]" />
          <StatMini label="Bảo trì" value={stats.maintenance} icon={<AlertTriangle className="w-5 h-5" />} color="text-[#E65100]" />
          <StatMini label="Hỏng hóc" value={stats.broken} icon={<ShieldAlert className="w-5 h-5" />} color="text-[#C62828]" />
        </div>
      </div>

      {/* Error State */}
      {fetchError && (
        <div className="bg-[#FDEDED] border border-[#C62828] text-[#C62828] p-4 rounded-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="text-[14px] font-medium">{fetchError}</span>
          </div>
          <button onClick={fetchData} className="flex items-center gap-1 text-[13px] bg-white px-3 py-1.5 rounded border border-[#C62828] hover:bg-red-50">
            <RefreshCw className="w-4 h-4" /> Thử lại
          </button>
        </div>
      )}

      {/* Table Area */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E0E0E0] overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#E0E0E0] bg-[#F5F5F5] flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#757575]" />
              <input 
                type="text" 
                placeholder="Tìm tên hoặc mã thiết bị..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-[#E0E0E0] rounded text-[14px] focus:outline-none focus:border-[#1E5FA5]"
              />
            </div>
          </div>
          <button onClick={fetchData} className="p-2 text-[#757575] hover:text-[#1E5FA5] hover:bg-white rounded border border-transparent hover:border-[#E0E0E0] transition-colors bg-white">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-[#E0E0E0] bg-white">
                <th className="px-4 py-3 text-[13px] font-semibold text-[#757575]">ID & Tên thiết bị</th>
                <th className="px-4 py-3 text-[13px] font-semibold text-[#757575]">Serial Number</th>
                <th className="px-4 py-3 text-[13px] font-semibold text-[#757575]">Phòng Lab</th>
                <th className="px-4 py-3 text-[13px] font-semibold text-[#757575]">Trạng thái</th>
                <th className="px-4 py-3 text-[13px] font-semibold text-[#757575]">Bảo trì lần cuối</th>
                <th className="px-4 py-3 text-[13px] font-semibold text-[#757575] text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              
              {isLoading && Array.from({ length: 4 }).map((_, i) => (
                <tr key={`skel-${i}`} className="animate-pulse bg-white">
                  <td className="px-4 py-4"><div className="h-4 bg-[#E0E0E0] rounded w-32 mb-1"></div></td>
                  <td className="px-4 py-4"><div className="h-4 bg-[#E0E0E0] rounded w-20"></div></td>
                  <td className="px-4 py-4"><div className="h-4 bg-[#E0E0E0] rounded w-24"></div></td>
                  <td className="px-4 py-4"><div className="h-5 bg-[#E0E0E0] rounded w-16"></div></td>
                  <td className="px-4 py-4"><div className="h-4 bg-[#E0E0E0] rounded w-20"></div></td>
                  <td className="px-4 py-4"><div className="h-6 bg-[#E0E0E0] rounded w-16 ml-auto"></div></td>
                </tr>
              ))}

              {!isLoading && filteredDevices.map((dev, i) => (
                <tr key={i} className="hover:bg-[#F5F5F5] bg-white transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-[14px] font-medium text-[#212121]">{dev.name}</div>
                    <div className="text-[12px] text-[#757575]">ID: {dev.id}</div>
                  </td>
                  <td className="px-4 py-3 text-[14px] text-[#212121] font-mono">{dev.serial_number}</td>
                  <td className="px-4 py-3 text-[14px] text-[#212121]">{dev.room?.name || 'Chưa xếp phòng'}</td>
                  <td className="px-4 py-3"><StatusBadge status={dev.status} /></td>
                  <td className="px-4 py-3 text-[14px] text-[#212121]">
                    {dev.last_maintenance ? format(new Date(dev.last_maintenance), "dd/MM/yyyy") : "Chưa bảo trì"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDevice(dev);
                        setIsDetailModalOpen(true);
                      }} className="p-1.5 text-[#757575] hover:text-[#1E5FA5] hover:bg-[#D6E4F7] rounded" title="Bình luận & Chi tiết">
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { 
                        e.stopPropagation();
                        setEditingDevice({ id: dev.id, name: dev.name, serial_number: dev.serial_number, room_id: dev.room_id || 0, status: dev.status }); 
                        fetchRooms(); 
                        setIsEditingDevice(true); 
                      }} className="p-1.5 text-[#757575] hover:text-[#1E5FA5] hover:bg-[#D6E4F7] rounded" title="Sửa">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(dev.id);
                      }} className="p-1.5 text-[#757575] hover:text-[#C62828] hover:bg-[#FDEDED] rounded" title="Xóa">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!isLoading && filteredDevices.length === 0 && !fetchError && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#757575]">
                    <DatabaseBackup className="w-12 h-12 mx-auto mb-3 text-[#E0E0E0]" />
                    <p className="mb-4">Chưa có thiết bị nào</p>
                    <button onClick={openAddModal} className="px-4 py-2 bg-[#1E5FA5] text-white rounded-md text-[14px]">Thêm thiết bị ngay</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail & Comment Modal */}
      {isDetailModalOpen && selectedDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[#E0E0E0] flex justify-between items-center bg-[#F5F5F5]">
              <div>
                <h2 className="text-[20px] font-bold text-[#212121]">Chi tiết thiết bị #{selectedDevice.id}</h2>
                <p className="text-[14px] text-[#757575] mt-1">{selectedDevice.name}</p>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="text-[#757575] hover:text-[#212121] p-2 bg-white rounded-full"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="space-y-4 mb-8">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[13px] text-[#757575]">Số Serial:</span>
                    <p className="text-[14px] font-medium text-[#212121] font-mono">{selectedDevice.serial_number}</p>
                  </div>
                  <div>
                    <span className="text-[13px] text-[#757575]">Trạng thái:</span>
                    <div><StatusBadge status={selectedDevice.status} /></div>
                  </div>
                  <div>
                    <span className="text-[13px] text-[#757575]">Phòng Lab:</span>
                    <p className="text-[14px] font-medium text-[#212121]">{selectedDevice.room?.name || 'Chưa xếp phòng'}</p>
                  </div>
                  <div>
                    <span className="text-[13px] text-[#757575]">Ngày thêm:</span>
                    <p className="text-[14px] font-medium text-[#212121]">{format(new Date(selectedDevice.created_at), "dd/MM/yyyy")}</p>
                  </div>
                </div>
              </div>

              {/* Tích hợp Component Comment */}
              <div className="border-t border-[#E0E0E0] pt-6">
                <CommentSection
                  entityType="equipment"
                  entityId={selectedDevice.id}
                  currentUser={currentUser}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        title="Xóa thiết bị"
        message="Bạn có chắc chắn muốn xóa thiết bị này không? Hành động này không thể hoàn tác."
        confirmText="Xóa thiết bị"
        isDestructive={true}
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {isAddingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-[20px] font-bold text-[#212121] mb-4">Thêm thiết bị mới</h2>
            <form onSubmit={handleAddDevice} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Tên thiết bị</label>
                <input required type="text" value={newDevice.name} onChange={e => setNewDevice({...newDevice, name: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md focus:outline-none focus:border-[#1E5FA5]" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Số Serial</label>
                <input required type="text" value={newDevice.serial_number} onChange={e => setNewDevice({...newDevice, serial_number: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md focus:outline-none focus:border-[#1E5FA5]" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Phòng Lab</label>
                <select value={newDevice.room_id} onChange={e => setNewDevice({...newDevice, room_id: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md focus:outline-none focus:border-[#1E5FA5]">
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsAddingDevice(false)} className="px-4 py-2 text-[#757575] hover:bg-[#F5F5F5] rounded-md transition-colors">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-[#1E5FA5] hover:bg-[#154a85] text-white rounded-md transition-colors">Lưu thiết bị</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-[20px] font-bold text-[#212121] mb-4">Sửa thông tin thiết bị</h2>
            <form onSubmit={handleUpdateDevice} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Tên thiết bị</label>
                <input required type="text" value={editingDevice.name} onChange={e => setEditingDevice({...editingDevice, name: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md focus:outline-none focus:border-[#1E5FA5]" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Số Serial</label>
                <input required type="text" value={editingDevice.serial_number} onChange={e => setEditingDevice({...editingDevice, serial_number: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md focus:outline-none focus:border-[#1E5FA5]" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Phòng Lab</label>
                <select value={editingDevice.room_id} onChange={e => setEditingDevice({...editingDevice, room_id: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md focus:outline-none focus:border-[#1E5FA5]">
                  <option value={0}>Không xếp phòng</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Trạng thái</label>
                <select value={editingDevice.status} onChange={e => setEditingDevice({...editingDevice, status: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md focus:outline-none focus:border-[#1E5FA5]">
                  <option value="AVAILABLE">Khả dụng</option>
                  <option value="IN_USE">Đang dùng</option>
                  <option value="MAINTENANCE">Bảo trì</option>
                  <option value="BROKEN">Hỏng hóc</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsEditingDevice(false)} className="px-4 py-2 text-[#757575] hover:bg-[#F5F5F5] rounded-md transition-colors">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-[#1E5FA5] hover:bg-[#154a85] text-white rounded-md transition-colors">Cập nhật</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatMini({ label, value, icon, color }: any) {
  return (
    <div className="bg-white p-4 rounded-xl border border-[#E0E0E0] shadow-sm flex items-center justify-between">
      <div>
        <div className="text-[12px] text-[#757575] font-medium mb-1">{label}</div>
        <div className={`text-[20px] font-bold text-[#212121]`}>{value}</div>
      </div>
      <div className={`p-2 rounded-md bg-[#F5F5F5] ${color}`}>
        {icon}
      </div>
    </div>
  );
}
