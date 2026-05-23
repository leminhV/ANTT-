import { useState, useEffect } from "react";
import { Download, FileText, Settings, AlertTriangle, CheckCircle, Plus, Search, Check, RefreshCw, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { reportService, equipmentService, roomService } from "../../services";
import { format } from "date-fns";

const MOCK_BAR_DATA = [
  { name: 'T2', value: 40 }, { name: 'T3', value: 65 }, { name: 'T4', value: 80 }, { name: 'T5', value: 45 },
  { name: 'T6', value: 90 }, { name: 'T7', value: 20 }, { name: 'CN', value: 10 },
];

const MOCK_PIE_DATA = [
  { name: 'Đã duyệt', value: 60, color: '#2E7D32' },
  { name: 'Chờ duyệt', value: 25, color: '#F59E0B' },
  { name: 'Đã hủy', value: 15, color: '#EF4444' },
];

const MOCK_HEATMAP = Array.from({ length: 7 }, (_, day) => 
  Array.from({ length: 8 }, (_, hour) => ({
    day, hour, value: Math.floor(Math.random() * 100)
  }))
);
const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const HOURS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

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
  
  // States cho Sự cố
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", equipment_id: "", room_id: "" });
  const [equipments, setEquipments] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  const currentUserStr = localStorage.getItem("user");
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'TECHNICIAN';

  useEffect(() => {
    if (activeTab === "Sự cố") fetchData();
  }, [activeTab]);

  const fetchData = async () => {
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
      console.error("Lỗi khi tải dữ liệu báo cáo", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await reportService.create({
        title: formData.title,
        description: formData.description,
        equipment_id: formData.equipment_id ? parseInt(formData.equipment_id) : undefined,
        room_id: formData.room_id ? parseInt(formData.room_id) : undefined,
      } as any);
      alert("Đã gửi báo cáo sự cố!");
      setIsModalOpen(false);
      setFormData({ title: "", description: "", equipment_id: "", room_id: "" });
      fetchData();
    } catch (error) {
      alert("Lỗi khi gửi báo cáo.");
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await reportService.update(id.toString(), { status });
      fetchData();
    } catch (error) {
      alert("Cập nhật trạng thái thất bại");
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-300 pb-8 h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-[24px] font-bold text-[#212121] mb-4">Báo cáo & Thống kê</h1>
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
        </div>
        {activeTab === "Thống kê" && (
          <button className="flex items-center gap-2 bg-white border border-[#E0E0E0] hover:bg-[#F5F5F5] text-[#212121] px-4 py-2.5 rounded-md font-medium transition-colors text-[14px] shadow-sm mb-2">
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
            <KPICard title="Tổng số yêu cầu" value="1,284" sub="+12% tuần này" icon={<FileText className="w-5 h-5 text-[#1E5FA5]" />} bg="bg-[#D6E4F7]/50" />
            <KPICard title="Thiết bị đang bảo trì" value="15" sub="3 thiết bị sắp sửa xong" icon={<Settings className="w-5 h-5 text-[#F59E0B]" />} bg="bg-[#FFF8E1]" />
            <KPICard title="Hóa chất sắp hết hạn" value="8" sub="Cần kiểm tra ngay" icon={<AlertTriangle className="w-5 h-5 text-[#EF4444]" />} bg="bg-[#FDEDED]" />
            <KPICard title="Tỷ lệ phê duyệt" value="85%" sub="Ổn định" icon={<CheckCircle className="w-5 h-5 text-[#2E7D32]" />} bg="bg-[#E8F5E9]" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-[#E0E0E0] p-6">
              <h2 className="text-[16px] font-bold text-[#212121] mb-6">Tần suất sử dụng phòng Lab theo tuần</h2>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MOCK_BAR_DATA}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#757575', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#757575', fontSize: 12}} />
                    <Tooltip cursor={{fill: '#F5F5F5'}} contentStyle={{borderRadius: '8px', border: '1px solid #E0E0E0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'}} />
                    <Bar dataKey="value" fill="#1E5FA5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-[#E0E0E0] p-6">
              <h2 className="text-[16px] font-bold text-[#212121] mb-6">Tỷ lệ trạng thái đơn hàng</h2>
              <div className="h-[280px] flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={MOCK_PIE_DATA} innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                      {MOCK_PIE_DATA.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '8px', border: '1px solid #E0E0E0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'}} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-[140px] flex flex-col gap-4">
                  {MOCK_PIE_DATA.map(item => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}}></div>
                      <div>
                        <div className="text-[12px] text-[#757575]">{item.name}</div>
                        <div className="text-[14px] font-bold text-[#212121]">{item.value}%</div>
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
                  <tr><td colSpan={6} className="p-8 text-center text-[#757575]">Đang tải...</td></tr>
                ) : reports.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F5F5F5] bg-white transition-colors">
                    <td className="px-6 py-4 text-[14px] text-[#212121]">{format(new Date(r.created_at), "dd/MM/yyyy HH:mm")}</td>
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
                        {r.status === 'OPEN' && (
                          <button onClick={() => handleUpdateStatus(r.id, "IN_PROGRESS")} className="text-[12px] px-3 py-1 bg-[#FFF8E1] text-[#F59E0B] border border-[#FFECB3] hover:bg-[#FFECB3] rounded transition-colors mr-2">
                            Bắt đầu sửa
                          </button>
                        )}
                        {r.status === 'IN_PROGRESS' && (
                          <button onClick={() => handleUpdateStatus(r.id, "RESOLVED")} className="text-[12px] px-3 py-1 bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] hover:bg-[#C8E6C9] rounded transition-colors">
                            Hoàn tất
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {!isLoading && reports.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-[#757575]">Không có báo cáo nào.</td></tr>
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
