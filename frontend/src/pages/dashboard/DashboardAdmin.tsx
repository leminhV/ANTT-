import { useState, useEffect } from "react";
import { Users, MonitorPlay, Activity, Check, X } from "lucide-react";
import { motion } from "motion/react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { bookingService, roomService, equipmentService } from "../../services";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";

// Màu sắc cho biểu đồ Đơn đặt phòng
const BOOKING_COLORS: Record<string, string> = {
  PENDING:   "#F59E0B",
  APPROVED:  "#3B82F6",
  COMPLETED: "#10B981",
  REJECTED:  "#EF4444",
  CANCELED:  "#9CA3AF",
};

// Màu sắc cho biểu đồ Thiết bị
const EQUIPMENT_COLORS: Record<string, string> = {
  AVAILABLE:   "#10B981",
  IN_USE:      "#3B82F6",
  MAINTENANCE: "#F59E0B",
  BROKEN:      "#EF4444",
};

const STATUS_VI: Record<string, string> = {
  PENDING:   "Chờ duyệt",
  APPROVED:  "Đã duyệt",
  COMPLETED: "Hoàn thành",
  REJECTED:  "Từ chối",
  CANCELED:  "Đã hủy",
  AVAILABLE:   "Khả dụng",
  IN_USE:      "Đang dùng",
  MAINTENANCE: "Bảo trì",
  BROKEN:      "Hỏng",
};

export function DashboardAdmin() {
  const [stats, setStats] = useState({
    pendingRequests: 0,
    devicesTotal: 0,
    roomsTotal: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [bookingChartData, setBookingChartData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [equipmentChartData, setEquipmentChartData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [bookingsRes, roomsRes, equipmentRes] = await Promise.all([
          bookingService.getAll(),
          roomService.getAll(),
          equipmentService.getAll()
        ]);

        const bookings = bookingsRes.data || [];
        const rooms = roomsRes.data || [];
        const equipment = equipmentRes.data || [];

        const pending = bookings.filter((b: any) => b.status === "PENDING");

        setStats({
          pendingRequests: pending.length,
          roomsTotal: rooms.length,
          devicesTotal: equipment.length,
        });

        // Get 5 most recent pending bookings
        setRecentBookings(pending.slice(0, 5));

        // --- Build Booking Chart Data ---
        const bookingStatusCounts: Record<string, number> = {};
        bookings.forEach((b: any) => {
          bookingStatusCounts[b.status] = (bookingStatusCounts[b.status] || 0) + 1;
        });
        const bookingData = Object.entries(bookingStatusCounts)
          .filter(([, count]) => count > 0)
          .map(([status, count]) => ({
            name: STATUS_VI[status] || status,
            value: count,
            color: BOOKING_COLORS[status] || "#9CA3AF",
          }));
        setBookingChartData(bookingData);

        // --- Build Equipment Chart Data ---
        const equipStatusCounts: Record<string, number> = {};
        equipment.forEach((e: any) => {
          equipStatusCounts[e.status] = (equipStatusCounts[e.status] || 0) + 1;
        });
        const equipData = Object.entries(equipStatusCounts)
          .filter(([, count]) => count > 0)
          .map(([status, count]) => ({
            name: STATUS_VI[status] || status,
            value: count,
            color: EQUIPMENT_COLORS[status] || "#9CA3AF",
          }));
        setEquipmentChartData(equipData);

      } catch (error) {
        // apiClient.ts đã xử lý toast
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      await bookingService.update(id.toString(), { status: "APPROVED" });
      setRecentBookings(recentBookings.filter(b => b.id !== id));
      setStats(prev => ({ ...prev, pendingRequests: prev.pendingRequests - 1 }));
    } catch (error) {
      // apiClient.ts đã xử lý toast
    }
  };

  const handleReject = async (id: number) => {
    try {
      await bookingService.update(id.toString(), { status: "REJECTED" });
      setRecentBookings(recentBookings.filter(b => b.id !== id));
      setStats(prev => ({ ...prev, pendingRequests: prev.pendingRequests - 1 }));
    } catch (error) {
      // apiClient.ts đã xử lý toast
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-slate-100">Admin Dashboard</h1>
        <p className="text-neutral-500 dark:text-slate-400 mt-1">Overview of lab utilization and pending requests.</p>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Widget
          icon={<Activity className="w-6 h-6 text-orange-600" />}
          bg="bg-orange-50"
          label="Pending Requests"
          value={isLoading ? "..." : stats.pendingRequests}
          trend="Needs approval"
        />
        <Widget
          icon={<MonitorPlay className="w-6 h-6 text-blue-600" />}
          bg="bg-blue-50"
          label="Total Devices"
          value={isLoading ? "..." : stats.devicesTotal}
          trend="Managed in system"
        />
        <Widget
          icon={<Users className="w-6 h-6 text-green-600" />}
          bg="bg-green-50"
          label="Total Rooms"
          value={isLoading ? "..." : stats.roomsTotal}
          trend="Active laboratories"
        />
      </div>

      {/* ── Charts Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Status Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-neutral-200 dark:border-slate-800 p-6 transition-colors duration-300">
          <h2 className="text-base font-bold text-neutral-900 dark:text-slate-100 mb-1">Tỷ lệ trạng thái Đơn đặt phòng</h2>
          <p className="text-sm text-neutral-500 dark:text-slate-400 mb-4">Phân bổ theo trạng thái xử lý</p>
          {isLoading ? (
            <div className="h-56 flex items-center justify-center text-neutral-400 dark:text-slate-500">Đang tải...</div>
          ) : bookingChartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-neutral-400 dark:text-slate-500">Chưa có dữ liệu</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={bookingChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {bookingChartData.map((entry, index) => (
                    <Cell key={`bk-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--tooltip-bg, #fff)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                  formatter={(value: number, name: string) => [`${value} đơn`, name]}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-[13px] text-neutral-700 dark:text-slate-300">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Equipment Status Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-neutral-200 dark:border-slate-800 p-6 transition-colors duration-300">
          <h2 className="text-base font-bold text-neutral-900 dark:text-slate-100 mb-1">Tỷ lệ trạng thái Thiết bị</h2>
          <p className="text-sm text-neutral-500 dark:text-slate-400 mb-4">Phân bổ theo tình trạng hoạt động</p>
          {isLoading ? (
            <div className="h-56 flex items-center justify-center text-neutral-400 dark:text-slate-500">Đang tải...</div>
          ) : equipmentChartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-neutral-400 dark:text-slate-500">Chưa có dữ liệu</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={equipmentChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {equipmentChartData.map((entry, index) => (
                    <Cell key={`eq-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--tooltip-bg, #fff)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                  formatter={(value: number, name: string) => [`${value} thiết bị`, name]}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-[13px] text-neutral-700 dark:text-slate-300">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-neutral-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
        <div className="px-6 py-5 border-b border-neutral-200 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-800/50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-slate-100">Recent Pending Requests</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-800/80">
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 dark:text-slate-400 uppercase tracking-wider">Student Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 dark:text-slate-400 uppercase tracking-wider">Lab Room</th>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 dark:text-slate-400 uppercase tracking-wider">Time Requested</th>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-slate-800">
              {isLoading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : recentBookings.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-neutral-500 dark:text-slate-400">No pending requests.</td></tr>
              ) : (
                recentBookings.map((req, i) => (
                  <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-neutral-900 dark:text-slate-200">{req.user?.name || "Unknown"}</div>
                      <div className="text-xs text-neutral-500 dark:text-slate-400">{req.user?.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-700 dark:text-slate-300">{req.room?.name || `Room ${req.room_id}`}</td>
                    <td className="px-6 py-4 text-sm text-neutral-700 dark:text-slate-300">
                      {req.start_time ? format(new Date(req.start_time), "MMM dd, HH:mm") : ""} -
                      {req.end_time ? format(new Date(req.end_time), " HH:mm") : ""}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-100 transition-colors" title="Reject">
                              <X className="w-4 h-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-neutral-900 dark:text-slate-100">Xác nhận từ chối</AlertDialogTitle>
                              <AlertDialogDescription className="text-neutral-500 dark:text-slate-400">
                                Bạn có chắc chắn muốn từ chối đơn đặt phòng này? Hành động này không thể hoàn tác.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-white dark:bg-slate-800 text-neutral-900 dark:text-slate-200 hover:bg-neutral-100 dark:hover:bg-slate-700 border border-neutral-200 dark:border-slate-700">Hủy bỏ</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleReject(req.id)} className="bg-red-600 hover:bg-red-700 text-white">
                                Xác nhận từ chối
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <button onClick={() => handleApprove(req.id)} className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded border border-green-100 transition-colors" title="Approve">
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton shimmer component ──
function SkeletonRow() {
  return (
    <tr>
      <td className="px-6 py-4">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-32"></div>
          <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-24"></div>
        </div>
      </td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-40"></div></td>
      <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-32"></div></td>
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end gap-2">
          <div className="h-7 w-7 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
          <div className="h-7 w-7 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
        </div>
      </td>
    </tr>
  );
}

function Widget({ icon, bg, label, value, trend }: any) {
  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: "0px 10px 20px rgba(0,0,0,0.05)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-neutral-200 dark:border-slate-800 p-6 flex flex-col transition-colors duration-300 cursor-pointer"
    >
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${bg} dark:bg-opacity-20`}>
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-neutral-500 dark:text-slate-400 uppercase tracking-wider">{label}</h3>
      </div>
      <div>
        <div className="text-3xl font-bold text-neutral-900 dark:text-slate-100">{value}</div>
        <div className="text-sm font-medium text-neutral-500 dark:text-slate-400 mt-1">{trend}</div>
      </div>
    </motion.div>
  );
}
