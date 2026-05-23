import { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, X, AlertCircle, RefreshCw, Filter, ShieldAlert, CheckCircle2, AlertTriangle, FileText, FileClock } from "lucide-react";
import { equipmentService } from "../../services";
import { format } from "date-fns";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await equipmentService.getAll();
      setDevices(res.data || []);
    } catch (error) {
      setFetchError("Lỗi máy chủ (500). Không thể tải danh sách thiết bị.");
      setDevices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa thiết bị này?")) {
      try {
        await equipmentService.delete(id.toString());
        setDevices(devices.filter(d => d.id !== id));
      } catch (error) {
        alert("Xóa thất bại!");
      }
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
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[#1E5FA5] hover:bg-[#154a85] text-white px-4 py-2 rounded-md font-medium transition-colors text-[14px]"
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
                      <button className="p-1.5 text-[#757575] hover:text-[#1E5FA5] hover:bg-[#D6E4F7] rounded" title="Sửa">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(dev.id)} className="p-1.5 text-[#757575] hover:text-[#C62828] hover:bg-[#FDEDED] rounded" title="Xóa">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!isLoading && filteredDevices.length === 0 && !fetchError && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#757575] bg-[#F5F5F5]">
                    Không tìm thấy thiết bị nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
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
