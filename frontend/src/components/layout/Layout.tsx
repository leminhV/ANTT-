import { Outlet, NavLink, useLocation, useNavigate } from "react-router";
import { LayoutDashboard, Calendar, Box, LogOut, Search, Bell, Settings, FileText, Server, Users, ChevronDown, BarChart2 } from "lucide-react";
import clsx from "clsx";
import { authService } from "../../services";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Read user from localStorage
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const storedRole = localStorage.getItem("userRole") || (user?.role?.toLowerCase());
  const isAdminPath = ["/admin-dashboard", "/approvals", "/resources", "/users", "/reports"].includes(location.pathname);
  const isAdmin = storedRole === "admin" || (!storedRole && isAdminPath);

  // Breadcrumb mapping
  const breadcrumbMap: Record<string, string> = {
    "/student-dashboard": "Dashboard tổng quan",
    "/admin-dashboard": "Dashboard tổng quan",
    "/calendar": "Lịch biểu / Đặt phòng",
    "/my-bookings": "Đơn đặt lịch của tôi",
    "/approvals": "Duyệt yêu cầu",
    "/resources": "Quản lý Phòng Lab, Thiết bị & Hóa chất",
    "/users": "Quản lý người dùng",
    "/reports": "Báo cáo & Thống kê",
  };
  const currentPath = location.pathname;
  const pageTitle = breadcrumbMap[currentPath] || "Dashboard";

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
            Menu Chính
          </div>
          
          {isAdmin ? (
            <>
              <NavItem to="/admin-dashboard" icon={<LayoutDashboard />} label="Dashboard tổng quan" />
              <NavItem to="/calendar" icon={<Calendar />} label="Lịch biểu / Đặt phòng" />
              <NavItem to="/approvals" icon={<FileText />} label="Duyệt yêu cầu" />
              <NavItem to="/resources" icon={<Server />} label="Quản lý tài nguyên" />
              <NavItem to="/users" icon={<Users />} label="Quản lý người dùng" />
              <NavItem to="/reports" icon={<BarChart2 />} label="Báo cáo & Thống kê" />
              <NavItem to="#" icon={<Settings />} label="Cài đặt hệ thống" />
            </>
          ) : (
            <>
              <NavItem to="/student-dashboard" icon={<LayoutDashboard />} label="Dashboard tổng quan" />
              <NavItem to="/calendar" icon={<Calendar />} label="Lịch biểu / Đặt phòng" />
              <NavItem to="/my-bookings" icon={<FileText />} label="Đơn của tôi" />
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
            <LogOut className="w-4 h-4" /> Đăng xuất
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
                placeholder="Tìm kiếm..." 
                className="pl-9 pr-4 py-2 bg-[#F5F5F5] border-none rounded-md text-[14px] focus:outline-none focus:ring-1 focus:ring-[#1E5FA5] w-64"
              />
            </div>
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
