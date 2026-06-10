import { useState, useEffect } from "react";
import { Search, XCircle, FileText, Calendar, CalendarX } from "lucide-react";
import { bookingService } from "../../services";
import { format } from "date-fns";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { toast } from "react-hot-toast";
import { ConfirmModal } from "../../components/common/ConfirmModal";
import { useNavigate } from "react-router";

export function MyBookings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelConfirmId, setCancelConfirmId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await bookingService.getMyBookings();
      setBookings(res.data || []);
    } catch (error) {
      // apiClient.ts đã xử lý toast
    } finally {
      setIsLoading(false);
    }
  };

  const executeCancel = async () => {
    if (cancelConfirmId) {
      try {
        await bookingService.cancel(cancelConfirmId.toString());
        toast.success("Hủy thành công");
        fetchData();
      } catch (error) {
        // apiClient.ts đã xử lý toast
      }
      setCancelConfirmId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "PENDING": return <span className="px-2.5 py-1 bg-[#FFF8E1] text-[#F59E0B] rounded text-[12px] font-medium border border-[#FFECB3]">Chờ duyệt</span>;
      case "APPROVED": return <span className="px-2.5 py-1 bg-[#E8F5E9] text-[#2E7D32] rounded text-[12px] font-medium border border-[#C8E6C9]">Đã duyệt</span>;
      case "REJECTED": return <span className="px-2.5 py-1 bg-[#FDEDED] text-[#EF4444] rounded text-[12px] font-medium border border-[#FFCDD2]">Từ chối</span>;
      case "CANCELED": return <span className="px-2.5 py-1 bg-[#F5F5F5] text-[#757575] rounded text-[12px] font-medium border border-[#E0E0E0]">Đã hủy</span>;
      default: return <span className="px-2.5 py-1 bg-[#F5F5F5] text-[#757575] rounded text-[12px] font-medium border border-[#E0E0E0]">{status}</span>;
    }
  };

  const filteredBookings = bookings.filter(b => 
    b.id.toString().includes(searchTerm) || 
    (b.room?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight">Đơn đặt lịch của tôi</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#E2E8F0] overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#E0E0E0] bg-[#F5F5F5] flex justify-between items-center">
          <div className="relative w-[300px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#757575]" />
            <input 
              type="text" 
              placeholder="Tìm theo mã đơn hoặc tên tài nguyên..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#E0E0E0] rounded text-[14px] focus:outline-none focus:border-[#1E5FA5]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-[#E0E0E0] bg-white">
                <th className="px-6 py-4 text-[13px] font-semibold text-[#757575]">Mã đơn</th>
                <th className="px-6 py-4 text-[13px] font-semibold text-[#757575]">Phòng Lab</th>
                <th className="px-6 py-4 text-[13px] font-semibold text-[#757575]">Mục đích</th>
                <th className="px-6 py-4 text-[13px] font-semibold text-[#757575]">Thời gian (Ngày & Giờ)</th>
                <th className="px-6 py-4 text-[13px] font-semibold text-[#757575]">Trạng thái</th>
                <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {isLoading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : filteredBookings.map((bk) => (
                <tr key={bk.id} className="hover:bg-[#F5F5F5] bg-white transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-[14px] font-medium text-[#1E5FA5]">
                      <FileText className="w-4 h-4" /> #{bk.id}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[14px] text-[#212121] font-medium">{bk.room?.name}</td>
                  <td className="px-6 py-4 text-[14px] text-[#757575]">{bk.purpose}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-[14px] text-[#212121]">
                      <Calendar className="w-4 h-4 text-[#757575]" /> 
                      {format(new Date(bk.start_time), "dd/MM/yyyy HH:mm")} - {format(new Date(bk.end_time), "HH:mm")}
                    </div>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(bk.status)}</td>
                  <td className="px-6 py-4 text-right">
                    {bk.status === "PENDING" && (
                      <button onClick={() => setCancelConfirmId(bk.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#C62828] text-[#C62828] hover:bg-[#FDEDED] rounded text-[13px] font-medium transition-colors">
                        <XCircle className="w-4 h-4" /> Hủy đơn
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!isLoading && filteredBookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-4">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center mb-2 shadow-inner">
                        <CalendarX className="w-10 h-10 text-blue-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800">Chưa có lịch đặt nào</h3>
                      <p className="text-sm text-slate-500 text-center leading-relaxed">
                        Bạn chưa thực hiện bất kỳ phiên đặt phòng nào. Hãy tạo mới một đơn đặt lịch để sử dụng tài nguyên của phòng Lab.
                      </p>
                      <button 
                        onClick={() => navigate('/calendar')} 
                        className="mt-4 px-6 py-2.5 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-lg text-[14px] font-medium shadow-md shadow-blue-500/20 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                      >
                        Đặt lịch ngay
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={cancelConfirmId !== null}
        title="Xác nhận hủy lịch"
        message="Bạn có chắc chắn muốn hủy đơn đặt lịch này không? Hành động này không thể hoàn tác."
        confirmText="Hủy lịch"
        isDestructive={true}
        onConfirm={executeCancel}
        onCancel={() => setCancelConfirmId(null)}
      />
    </div>
  );
}

// ── Skeleton shimmer component ──
function SkeletonRow() {
  return (
    <tr>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-24"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-32"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-40"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-32"></div>
      </td>
      <td className="px-6 py-4">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-20"></div>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-20"></div>
        </div>
      </td>
    </tr>
  );
}

