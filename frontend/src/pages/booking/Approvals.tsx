import { useState, useEffect } from "react";
import { Search, Check, X, CheckSquare, RefreshCw, CalendarX } from "lucide-react";
import { bookingService } from "../../services";
import { format } from "date-fns";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { toast } from "react-hot-toast";
import { ConfirmModal } from "../../components/common/ConfirmModal";

export function Approvals() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmState, setConfirmState] = useState<{isOpen: boolean, type: 'APPROVE_ALL' | 'REJECT', id?: number}>({isOpen: false, type: 'APPROVE_ALL'});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await bookingService.getAll();
      setRequests(res.data || []);
    } catch (error) {
      // apiClient.ts đã xử lý toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await bookingService.update(id.toString(), { status });
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      toast.success("Cập nhật trạng thái thành công");
    } catch (error) {
      // apiClient.ts đã xử lý toast
    }
  };

  const handleApproveAll = () => {
    const pendingReqs = requests.filter(r => r.status === "PENDING");
    if (pendingReqs.length === 0) {
      toast.error("Không có đơn chờ duyệt");
      return;
    }
    setConfirmState({ isOpen: true, type: 'APPROVE_ALL' });
  };

  const executeConfirmAction = async () => {
    if (confirmState.type === 'APPROVE_ALL') {
      const pendingReqs = requests.filter(r => r.status === "PENDING");
      try {
        await Promise.all(pendingReqs.map(r => bookingService.update(r.id.toString(), { status: "APPROVED" })));
        toast.success(`Đã duyệt ${pendingReqs.length} đơn`);
        fetchData();
      } catch (error) {
        // apiClient.ts đã xử lý toast
      }
    } else if (confirmState.type === 'REJECT' && confirmState.id) {
      handleUpdateStatus(confirmState.id, "REJECTED");
    }
    setConfirmState({ ...confirmState, isOpen: false });
  };

  const filteredRequests = requests.filter(r => {
    const matchStatus = r.status === statusFilter;
    const matchSearch = r.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        r.room?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        r.purpose.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <h1 className="text-[24px] font-bold text-[#212121]">Duyệt yêu cầu</h1>
        <button 
          onClick={handleApproveAll}
          className="flex items-center gap-2 bg-[#1E5FA5] hover:bg-[#154a85] text-white px-4 py-2.5 rounded-md font-medium transition-colors text-[14px]"
        >
          <CheckSquare className="w-4 h-4" /> Duyệt tất cả
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#E0E0E0] overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#E0E0E0] bg-[#F5F5F5] flex justify-between items-center flex-wrap gap-4">
          <div className="relative w-[320px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#757575]" />
            <input 
              type="text" 
              placeholder="Tìm theo người đăng ký hoặc tài nguyên..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#E0E0E0] rounded text-[14px] focus:outline-none focus:border-[#1E5FA5]"
            />
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={fetchData} className="p-2 text-[#757575] hover:text-[#1E5FA5] hover:bg-white rounded border border-transparent hover:border-[#E0E0E0] transition-colors bg-white">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-[#E0E0E0] rounded text-[14px] text-[#212121] outline-none"
            >
              <option value="PENDING">Trạng thái đơn: Chờ duyệt</option>
              <option value="APPROVED">Trạng thái đơn: Đã duyệt</option>
              <option value="REJECTED">Trạng thái đơn: Đã từ chối</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-[#E0E0E0] bg-white">
                <th className="px-4 py-4 w-12 text-center"><input type="checkbox" className="rounded text-[#1E5FA5] border-[#E0E0E0]" /></th>
                <th className="px-4 py-4 text-[13px] font-semibold text-[#757575]">Người đăng ký</th>
                <th className="px-4 py-4 text-[13px] font-semibold text-[#757575]">Phòng / Thiết bị</th>
                <th className="px-4 py-4 text-[13px] font-semibold text-[#757575]">Mục đích</th>
                <th className="px-4 py-4 text-[13px] font-semibold text-[#757575]">Thời gian yêu cầu</th>
                {statusFilter === "PENDING" && <th className="px-4 py-4 text-[13px] font-semibold text-[#757575] text-center w-32">Hành động</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12">
                    <LoadingSpinner text="Đang tải danh sách đơn..." />
                  </td>
                </tr>
              ) : filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-[#F5F5F5] bg-white transition-colors">
                  <td className="px-4 py-4 text-center"><input type="checkbox" className="rounded text-[#1E5FA5] border-[#E0E0E0]" /></td>
                  <td className="px-4 py-4">
                    <div className="text-[14px] font-bold text-[#212121]">{req.user?.name}</div>
                    <div className="text-[12px] text-[#757575]">{req.user?.email}</div>
                  </td>
                  <td className="px-4 py-4 text-[14px] text-[#212121] font-medium">{req.room?.name || 'Không có phòng'}</td>
                  <td className="px-4 py-4 text-[14px] text-[#212121]">{req.purpose}</td>
                  <td className="px-4 py-4">
                    <div className="text-[14px] text-[#212121] font-medium">{format(new Date(req.start_time), "dd/MM/yyyy")}</div>
                    <div className="text-[12px] text-[#757575]">{format(new Date(req.start_time), "HH:mm")} - {format(new Date(req.end_time), "HH:mm")}</div>
                  </td>
                  {statusFilter === "PENDING" && (
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleUpdateStatus(req.id, "APPROVED")} className="p-1.5 bg-[#E8F5E9] text-[#2E7D32] hover:bg-[#C8E6C9] rounded transition-colors" title="Phê duyệt">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setConfirmState({ isOpen: true, type: 'REJECT', id: req.id })} className="p-1.5 bg-[#FDEDED] text-[#C62828] hover:bg-[#FFCDD2] rounded transition-colors" title="Từ chối">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!isLoading && filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#757575]">
                    <CalendarX className="w-12 h-12 mx-auto mb-3 text-[#E0E0E0]" />
                    <p>Không có yêu cầu đặt lịch nào</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.type === 'APPROVE_ALL' ? "Duyệt tất cả" : "Từ chối yêu cầu"}
        message={confirmState.type === 'APPROVE_ALL' 
          ? "Bạn có chắc chắn muốn phê duyệt tất cả các đơn đang chờ duyệt không?" 
          : "Bạn có chắc chắn muốn từ chối yêu cầu đặt phòng này?"}
        confirmText={confirmState.type === 'APPROVE_ALL' ? "Duyệt tất cả" : "Từ chối"}
        isDestructive={confirmState.type === 'REJECT'}
        onConfirm={executeConfirmAction}
        onCancel={() => setConfirmState({ ...confirmState, isOpen: false })}
      />
    </div>
  );
}
