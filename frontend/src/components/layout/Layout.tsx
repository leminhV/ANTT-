import { Outlet, NavLink, useLocation, useNavigate } from "react-router";
import { LayoutDashboard, Calendar, LogOut, Search, Bell, Settings, FileText, Server, Users, ChevronDown, BarChart2, BookOpen } from "lucide-react";
import clsx from "clsx";
import { authService } from "../../services";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { AIAssistant } from "../AIAssistant/AIAssistant";
import apiClient from "../../services/apiClient";
import toast from "react-hot-toast";
import { socketService } from "../../services/socket";

export function Layout() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Read user from localStorage
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const storedRole = localStorage.getItem("userRole") || (user?.role?.toLowerCase());
  const isAdminPath = ["/admin-dashboard", "/approvals", "/resources", "/courses", "/users", "/reports"].includes(location.pathname);
  const isAdmin = storedRole === "admin" || (!storedRole && isAdminPath);
  const actualRole = user?.role || (isAdmin ? 'ADMIN' : 'STUDENT');

  const [bookings, setBookings] = useState([]);
  const [equipment, setEquipment] = useState([]);

  useEffect(() => {
    if (user) {
      apiClient.get('/bookings').then(res => setBookings(res.data)).catch(() => {});
      apiClient.get('/equipment').then(res => setEquipment(res.data)).catch(() => {});
    }

    // Kết nối Socket.io để nhận thông báo realtime
    const socket = socketService.connect();
    if (socket) {
      socket.on('notification', (data: any) => {
        if (data.type === 'success') toast.success(data.message, { duration: 4000 });
        else if (data.type === 'error') toast.error(data.message, { duration: 4000 });
        else toast(data.message);

        // Tự động tải lại danh sách Booking khi có sự thay đổi
        if (user) {
          apiClient.get('/bookings').then(res => setBookings(res.data)).catch(() => {});
        }
      });
    }

    return () => {
      socketService.disconnect();
    };
  }, [user]);

  const handleAIAction = async (action: string, payload?: any) => {
    try {
      if (action === 'approve-all') {
        await apiClient.put('/bookings/approve-all');
        toast.success("Đã phê duyệt tất cả các đơn chờ!");
      } else if (action === 'cancel-booking') {
        if (payload?.id) {
           // Dùng PATCH thay vì PUT theo đúng chuẩn Controller Backend hiện tại
           await apiClient.patch(`/bookings/${payload.id}`, { status: "CANCELED" });
           toast.success(`Đã hủy booking #${payload.id}`);
        }
      }
      // Nạp lại danh sách Booking sau khi AI thực hiện action thành công
      apiClient.get('/bookings').then(res => setBookings(res.data)).catch(() => {});
    } catch (e) {
      toast.error("Lệnh AI xử lý thất bại.");
    }
  };

  // Breadcrumb mapping
  const breadcrumbMap: Record<string, string> = {
    "/student-dashboard": t("dashboard"),
    "/admin-dashboard": t("dashboard"),
    "/calendar": t("calendar"),
    "/my-bookings": t("my_bookings"),
    "/approvals": t("approvals"),
    "/resources": t("resources"),
    "/courses": t("courses"),
    "/users": t("users"),
    "/reports": t("reports"),
    "/settings": t("settings"),
  };
  const currentPath = location.pathname;
  const pageTitle = breadcrumbMap[currentPath] || t("dashboard");

  return (
    <div className="flex h-screen w-full bg-[#F5F5F5] text-[#212121] font-sans overflow-hidden">
      {/* Sidebar (240px) */}
      <aside className="w-[240px] bg-white border-r border-[#E0E0E0] flex flex-col flex-shrink-0 z-20">
        {/* Logo */}
        <div className="h-[64px] flex items-center gap-3 px-6 border-b border-[#E0E0E0]">
          <div className="w-8 h-8 bg-[#1E5FA5] rounded flex items-center justify-center text-white font-bold">
            L
          </div>
          <div className="font-bold text-xl text-[#1E5FA5]">LabBook</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="text-[12px] font-semibold text-[#757575] uppercase tracking-wider mb-3 px-2">
            {t("main_menu")}
          </div>
          
          {isAdmin ? (
            <>
              <NavItem to="/admin-dashboard" icon={<LayoutDashboard />} label={t("dashboard")} />
              <NavItem to="/calendar" icon={<Calendar />} label={t("calendar")} />
              <NavItem to="/approvals" icon={<FileText />} label={t("approvals")} />
              <NavItem to="/resources" icon={<Server />} label={t("resources")} />
              <NavItem to="/courses" icon={<BookOpen />} label={t("courses")} />
              <NavItem to="/users" icon={<Users />} label={t("users")} />
              <NavItem to="/reports" icon={<BarChart2 />} label={t("reports")} />
              <NavItem to="/settings" icon={<Settings />} label={t("settings")} />
            </>
          ) : (
            <>
              <NavItem to="/student-dashboard" icon={<LayoutDashboard />} label={t("dashboard")} />
              <NavItem to="/calendar" icon={<Calendar />} label={t("calendar")} />
              <NavItem to="/my-bookings" icon={<FileText />} label={t("my_bookings")} />
              <NavItem to="/reports" icon={<BarChart2 />} label={t("reports")} />
            </>
          )}
        </nav>

        {/* User Profile Bottom */}
        <div className="p-4 border-t border-[#E0E0E0]">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-[#D6E4F7] text-[#1E5FA5] flex items-center justify-center font-bold">
              {user ? user.name.substring(0, 2).toUpperCase() : (isAdmin ? "AD" : "SV")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-[#212121] truncate">
                {user ? user.name : (isAdmin ? "Admin System" : "Nguyễn Văn A")}
              </div>
              <div className="text-[12px] text-[#757575] truncate">
                {user ? user.email : (isAdmin ? "admin@vju.ac.vn" : "student@vju.ac.vn")}
              </div>
            </div>
          </div>
          <button 
            onClick={() => {
              authService.logout();
              navigate("/");
            }}
            className="w-full flex items-center gap-2 px-2 py-2 text-[14px] text-[#C62828] hover:bg-[#F5F5F5] rounded-md transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" /> {t("logout")}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar (64px) */}
        <header className="h-[64px] bg-white border-b border-[#E0E0E0] flex items-center justify-between px-6 flex-shrink-0 z-10">
          {/* Breadcrumb */}
          <div className="flex items-center text-[14px] font-medium text-[#757575]">
            Trang chủ <span className="mx-2">/</span> <span className="text-[#212121]">{pageTitle}</span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 text-[#757575] absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder={t("search_placeholder")} 
                className="pl-9 pr-4 py-2 bg-[#F5F5F5] border-none rounded-md text-[14px] focus:outline-none focus:ring-1 focus:ring-[#1E5FA5] w-64"
              />
            </div>
            
            {/* Language Switcher */}
            <select
              className="bg-transparent text-sm font-medium text-[#757575] border-none focus:ring-0 cursor-pointer outline-none"
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
            >
              <option value="vi">🇻🇳 VI</option>
              <option value="en">🇬🇧 EN</option>
              <option value="ja">🇯🇵 JA</option>
            </select>
            <button className="relative p-2 text-[#757575] hover:bg-[#F5F5F5] rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#C62828] rounded-full border border-white"></span>
            </button>
            <div className="h-6 w-px bg-[#E0E0E0] mx-1"></div>
            <button className="flex items-center gap-2 hover:bg-[#F5F5F5] p-1.5 rounded-md transition-colors">
              <div className="w-8 h-8 rounded-full bg-[#D6E4F7] text-[#1E5FA5] flex items-center justify-center font-bold text-[14px]">
                {isAdmin ? "AD" : "SV"}
              </div>
              <ChevronDown className="w-4 h-4 text-[#757575]" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-[24px]">
          <Outlet />
        </main>
      </div>
      
      {/* AI Assistant */}
      <AIAssistant 
        userRole={actualRole} 
        bookings={bookings} 
        equipment={equipment} 
        onAction={handleAIAction} 
      />
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-[14px] font-medium",
          isActive
            ? "bg-[#D6E4F7] text-[#1E5FA5] font-semibold"
            : "text-[#212121] hover:bg-[#F5F5F5]"
        )
      }
    >
      <div className="w-5 h-5 flex items-center justify-center">{icon}</div>
      <span>{label}</span>
    </NavLink>
  );
}
