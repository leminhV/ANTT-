import { useState, useEffect } from "react";
import { Users, MonitorPlay, Activity, Check, X } from "lucide-react";
import { bookingService, roomService, equipmentService } from "../../services";
import { format } from "date-fns";

export function DashboardAdmin() {
  const [stats, setStats] = useState({
    pendingRequests: 0,
    devicesTotal: 0,
    roomsTotal: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
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
        <h1 className="text-3xl font-bold text-neutral-900">Admin Dashboard</h1>
        <p className="text-neutral-500 mt-1">Overview of lab utilization and pending requests.</p>
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

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-200 bg-neutral-50/50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-neutral-900">Recent Pending Requests</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Student Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Lab Room</th>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Time Requested</th>
                <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-neutral-500">Loading data...</td></tr>
              ) : recentBookings.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-neutral-500">No pending requests.</td></tr>
              ) : (
                recentBookings.map((req, i) => (
                  <tr key={i} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-neutral-900">{req.user?.name || "Unknown"}</div>
                      <div className="text-xs text-neutral-500">{req.user?.email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-700">{req.room?.name || `Room ${req.room_id}`}</td>
                    <td className="px-6 py-4 text-sm text-neutral-700">
                      {req.start_time ? format(new Date(req.start_time), "MMM dd, HH:mm") : ""} - 
                      {req.end_time ? format(new Date(req.end_time), " HH:mm") : ""}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleReject(req.id)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-100 transition-colors" title="Reject">
                          <X className="w-4 h-4" />
                        </button>
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

function Widget({ icon, bg, label, value, trend }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 flex flex-col">
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">{label}</h3>
      </div>
      <div>
        <div className="text-3xl font-bold text-neutral-900">{value}</div>
        <div className="text-sm font-medium text-neutral-500 mt-1">{trend}</div>
      </div>
    </div>
  );
}
