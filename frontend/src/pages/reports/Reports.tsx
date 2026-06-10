import { useState, useEffect, useCallback } from "react";
import { Download, FileText, Settings, AlertTriangle, CheckCircle, Plus, Search, RefreshCw, X, FileX, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { reportService, equipmentService, roomService } from "../../services";
import { format } from "date-fns";
import { timeAgo } from "../../utils/timeAgo";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ConfirmModal } from "../../components/common/ConfirmModal";
import { toast } from "react-hot-toast";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'OPEN': return <span className="px-2 py-1 bg-[#FDEDED] text-[#C62828] rounded text-[12px] font-medium border border-[#FFCDD2]">Chưa xử lý</span>;
    case 'IN_PROGRESS': return <span className="px-2 py-1 bg-[#FFF8E1] text-[#F59E0B] rounded text-[12px] font-medium border border-[#FFECB3]">Đang xử lý</span>;
    case 'RESOLVED': return <span className="px-2 py-1 bg-[#E8F5E9] text-[#2E7D32] rounded text-[12px] font-medium border border-[#C8E6C9]">Đã khắc phục</span>;
    default: return <span className="px-2 py-1 bg-[#F5F5F5] text-[#757575] rounded text-[12px] font-medium">{status}</span>;
  }
}

export function Reports() {
  const [activeTab, setActiveTab] = useState("Sự cố"); // 'Thống kê' hoặc 'Sự cố'
  const [chartMonth, setChartMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  // States cho Sự cố
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", equipment_id: "", room_id: "" });
  const [equipments, setEquipments] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [deleteConfirmReportId, setDeleteConfirmReportId] = useState<number | null>(null);

  const currentUserStr = localStorage.getItem("user");
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'TECHNICIAN';

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [repRes, eqRes, roomRes] = await Promise.all([
        isAdmin ? reportService.getAll() : reportService.getMyReports(),
        equipmentService.getAll(),
        roomService.getAll()
      ]);
      setReports(repRes.data || []);
      setEquipments(eqRes.data || []);
      setRooms(roomRes.data || []);
    } catch (error) {
      // apiClient.ts sẽ tự hiển thị toast lỗi
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (activeTab === "Sự cố") fetchData();
  }, [activeTab, fetchData]);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await reportService.create({
        title: formData.title,
        description: formData.description,
        equipment_id: formData.equipment_id ? parseInt(formData.equipment_id) : undefined,
        room_id: formData.room_id ? parseInt(formData.room_id) : undefined,
      } as any);
      toast.success("Đã gửi báo cáo sự cố!");
      setIsModalOpen(false);
      setFormData({ title: "", description: "", equipment_id: "", room_id: "" });
      fetchData();
    } catch (error) {
      // apiClient.ts sẽ tự hiển thị toast lỗi
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await reportService.update(id.toString(), { status });
      toast.success("Đã cập nhật trạng thái");
      fetchData();
    } catch (error) {
      // apiClient.ts sẽ tự hiển thị toast lỗi
    }
  };

  const executeDeleteReport = async () => {
    if (deleteConfirmReportId) {
      try {
        await reportService.delete(deleteConfirmReportId.toString());
        toast.success("Xóa báo cáo thành công");
        setDeleteConfirmReportId(null);
        fetchData();
      } catch (error) {
        toast.error("Xóa báo cáo thất bại");
      }
    }
  };

  const handleExportCSV = () => {
    if (reports.length === 0) {
      toast.error("Không có dữ liệu để xuất báo cáo");
      return;
    }
    const headers = ["ID", "Tên sự cố", "Mô tả", "Trạng thái", "Ngày tạo"];
    const csvRows = reports.map(r => [
      r.id,
      `"${r.title.replace(/"/g, '""')}"`,
      `"${r.description.replace(/"/g, '""')}"`,
      r.status,
      format(new Date(r.created_at), "dd/MM/yyyy")
    ].join(","));
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...csvRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bao-cao-su-co-${format(new Date(), "dd-MM-yyyy")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Xuất báo cáo thành công!");
  };

  const getChartData = () => {
    const [year, month] = chartMonth.split('-');
    if (!year || !month) return [];
    
    // Lọc báo cáo trong tháng được chọn
    const filteredReports = reports.filter(r => {
      const date = new Date(r.created_at);
      return date.getFullYear() === parseInt(year) && date.getMonth() + 1 === parseInt(month);
    });

    // Gom nhóm theo ngày
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const data = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const count = filteredReports.filter(r => new Date(r.created_at).getDate() === i).length;
      data.push({ name: `${i}/${month}`, value: count });
    }
    return data;
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-300 pb-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-[24px] font-bold text-[#212121] mb-4">{isAdmin ? "Báo cáo & Thống kê" : "Báo cáo sự cố"}</h1>
          {isAdmin && (
            <div className="flex border-b border-[#E0E0E0]">
              {['Thống kê', 'Sự cố'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2 text-[14px] font-medium border-b-2 transition-colors ${
                    activeTab === tab ? 'border-[#1E5FA5] text-[#1E5FA5]' : 'border-transparent text-[#757575] hover:text-[#212121]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
        </div>
        {activeTab === "Thống kê" && (
          <button onClick={handleExportCSV} className="flex items-center gap-2 bg-white border border-[#E0E0E0] hover:bg-[#F5F5F5] text-[#212121] px-4 py-2.5 rounded-md font-medium transition-colors text-[14px] shadow-sm mb-2">
            <Download className="w-4 h-4" /> Xuất báo cáo
          </button>
        )}
        {activeTab === "Sự cố" && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[#1E5FA5] hover:bg-[#154a85] text-white px-4 py-2.5 rounded-md font-medium transition-colors text-[14px] shadow-sm mb-2"
          >
            <Plus className="w-4 h-4" /> Báo cáo hỏng hóc
          </button>
        )}
      </div>

      {activeTab === "Thống kê" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <KPICard title="Tổng số sự cố" value={reports.length} sub="Toàn thời gian" icon={<FileText className="w-5 h-5 text-[#1E5FA5]" />} bg="bg-[#D6E4F7]/50" />
            <KPICard title="Chưa xử lý" value={reports.filter(r => r.status === 'OPEN').length} sub="Cần được xem xét" icon={<AlertTriangle className="w-5 h-5 text-[#EF4444]" />} bg="bg-[#FDEDED]" />
            <KPICard title="Đang xử lý" value={reports.filter(r => r.status === 'IN_PROGRESS').length} sub="Kỹ thuật viên đang làm" icon={<Settings className="w-5 h-5 text-[#F59E0B]" />} bg="bg-[#FFF8E1]" />
            <KPICard title="Đã khắc phục" value={reports.filter(r => r.status === 'RESOLVED').length} sub="Hoạt động bình thường" icon={<CheckCircle className="w-5 h-5 text-[#2E7D32]" />} bg="bg-[#E8F5E9]" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-[#E0E0E0] p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[16px] font-bold text-[#212121]">Biểu đồ sự cố</h2>
                <input 
                  type="month" 
                  value={chartMonth}
                  onChange={(e) => setChartMonth(e.target.value)}
                  className="px-3 py-1.5 border border-[#E0E0E0] rounded text-[13px] text-[#757575] focus:outline-none focus:border-[#1E5FA5] outline-none"
                />
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#757575', fontSize: 10}} dy={10} interval="preserveStartEnd" minTickGap={20} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: '#757575', fontSize: 12}} />
                    <Tooltip cursor={{fill: '#F5F5F5'}} contentStyle={{ borderRadius: '8px', border: '1px solid #E0E0E0' }} />
                    <Bar dataKey="value" fill="#1E5FA5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-[#E0E0E0] p-6">
              <h2 className="text-[16px] font-bold text-[#212121] mb-6">Tỷ lệ trạng thái sự cố</h2>
              <div className="h-[280px] flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={[
                        { name: 'Đã khắc phục', value: reports.filter(r => r.status === 'RESOLVED').length || 1, color: '#2E7D32' },
                        { name: 'Đang xử lý', value: reports.filter(r => r.status === 'IN_PROGRESS').length || 1, color: '#F59E0B' },
                        { name: 'Chưa xử lý', value: reports.filter(r => r.status === 'OPEN').length || 1, color: '#EF4444' }
                      ]} 
                      innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value"
                    >
                      {[
                        { color: '#2E7D32' }, { color: '#F59E0B' }, { color: '#EF4444' }
                      ].map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '8px', border: '1px solid #E0E0E0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'}} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-[140px] flex flex-col gap-4">
                  {[
                    { name: 'Đã khắc phục', value: reports.filter(r => r.status === 'RESOLVED').length, color: '#2E7D32' },
                    { name: 'Đang xử lý', value: reports.filter(r => r.status === 'IN_PROGRESS').length, color: '#F59E0B' },
                    { name: 'Chưa xử lý', value: reports.filter(r => r.status === 'OPEN').length, color: '#EF4444' }
                  ].map(item => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}}></div>
                      <div>
                        <div className="text-[12px] text-[#757575]">{item.name}</div>
                        <div className="text-[14px] font-bold text-[#212121]">{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Sự cố" && (
        <div className="bg-white rounded-xl shadow-sm border border-[#E0E0E0] flex-1 flex flex-col overflow-hidden animate-in fade-in duration-300">
          <div className="p-4 border-b border-[#E0E0E0] bg-[#F5F5F5] flex justify-between items-center">
            <div className="relative w-[300px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#757575]" />
              <input type="text" placeholder="Tìm kiếm báo cáo..." className="w-full pl-9 pr-4 py-2 bg-white border border-[#E0E0E0] rounded text-[14px] focus:outline-none focus:border-[#1E5FA5]" />
            </div>
            <button onClick={fetchData} className="p-2 text-[#757575] hover:text-[#1E5FA5] hover:bg-white rounded border border-transparent hover:border-[#E0E0E0] transition-colors bg-white">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-[#E0E0E0] bg-white sticky top-0 z-10">
                  <th className="px-6 py-4 text-[13px] font-semibold text-[#757575]">Ngày báo cáo</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-[#757575]">Người báo cáo</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-[#757575]">Tiêu đề</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-[#757575]">Thiết bị/Phòng</th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-[#757575]">Trạng thái</th>
                  {isAdmin && <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] text-center">Xử lý</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E0E0]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12">
                      <LoadingSpinner text="Đang tải danh sách báo cáo..." />
                    </td>
                  </tr>
                ) : reports.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F5F5F5] bg-white transition-colors">
                    <td className="px-6 py-4 text-[14px] text-[#212121]" title={format(new Date(r.created_at), "dd/MM/yyyy HH:mm")}>{timeAgo(r.created_at)}</td>
                    <td className="px-6 py-4 text-[14px] text-[#212121]">{r.user?.name}</td>
                    <td className="px-6 py-4">
                      <div className="text-[14px] font-bold text-[#212121]">{r.title}</div>
                      <div className="text-[12px] text-[#757575] mt-1 line-clamp-1">{r.description}</div>
                    </td>
                    <td className="px-6 py-4 text-[14px] text-[#212121]">
                      {r.equipment ? `TB: ${r.equipment.name}` : r.room ? `Phòng: ${r.room.name}` : '-'}
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {r.status === 'OPEN' && (
                            <button onClick={() => handleUpdateStatus(r.id, "IN_PROGRESS")} className="text-[12px] px-3 py-1 bg-[#FFF8E1] text-[#F59E0B] border border-[#FFECB3] hover:bg-[#FFECB3] rounded transition-colors">
                              Bắt đầu sửa
                            </button>
                          )}
                          {r.status === 'IN_PROGRESS' && (
                            <button onClick={() => handleUpdateStatus(r.id, "RESOLVED")} className="text-[12px] px-3 py-1 bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] hover:bg-[#C8E6C9] rounded transition-colors">
                              Hoàn tất
                            </button>
                          )}
                          <button onClick={() => setDeleteConfirmReportId(r.id)} className="p-1.5 text-[#757575] hover:text-[#C62828] hover:bg-[#FDEDED] rounded transition-colors" title="Xóa báo cáo">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {!isLoading && reports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#757575]">
                      <FileX className="w-12 h-12 mx-auto mb-3 text-[#E0E0E0]" />
                      <p>Không có báo cáo nào</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#E0E0E0] flex justify-between items-center bg-[#FAFAFA]">
              <h3 className="font-bold text-[#212121] text-[16px]">Báo cáo sự cố</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-[#757575] hover:bg-[#E0E0E0] rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateReport} className="p-6 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Tiêu đề sự cố <span className="text-red-500">*</span></label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5]" placeholder="Vd: Máy chiếu phòng Lab IoT không lên nguồn" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Thiết bị hỏng (Tùy chọn)</label>
                <select value={formData.equipment_id} onChange={e => setFormData({...formData, equipment_id: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5]">
                  <option value="">-- Không xác định thiết bị --</option>
                  {equipments.map(e => <option key={e.id} value={e.id}>{e.name} ({e.serial_number})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Phòng hỏng (Tùy chọn)</label>
                <select value={formData.room_id} onChange={e => setFormData({...formData, room_id: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5]">
                  <option value="">-- Không xác định phòng --</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Mô tả chi tiết <span className="text-red-500">*</span></label>
                <textarea required rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5]" placeholder="Mô tả rõ tình trạng bạn gặp phải..."></textarea>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-[#E0E0E0]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[14px] font-medium text-[#757575] hover:bg-[#F5F5F5] rounded-md transition-colors">Hủy</button>
                <button type="submit" className="px-4 py-2 text-[14px] font-bold text-white bg-[#1E5FA5] hover:bg-[#154a85] rounded-md transition-colors">Gửi báo cáo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirmReportId !== null}
        title="Xóa báo cáo sự cố"
        message="Bạn có chắc chắn muốn xóa báo cáo này không? Hành động này không thể hoàn tác!"
        confirmText="Xóa báo cáo"
        isDestructive={true}
        onConfirm={executeDeleteReport}
        onCancel={() => setDeleteConfirmReportId(null)}
      />
    </div>
  );
}

function KPICard({title, value, sub, icon, bg}: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E0E0E0] p-5 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>{icon}</div>
      <div>
        <div className="text-[13px] font-medium text-[#757575] mb-1">{title}</div>
        <div className="text-[24px] font-bold text-[#212121] leading-none mb-2">{value}</div>
        <div className="text-[12px] text-[#757575]">{sub}</div>
      </div>
    </div>
  );
}
