import { Outlet, NavLink, useLocation, useNavigate } from "react-router";
import { LayoutDashboard, Calendar, LogOut, Search, Bell, Settings, FileText, Server, Users, ChevronDown, BarChart2, BookOpen, Sun, Moon, AlertTriangle } from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "motion/react";
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
  const { theme, setTheme } = useTheme();
  
  // Read user from localStorage
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const storedRole = localStorage.getItem("userRole") || (user?.role?.toLowerCase());
  const isAdminPath = ["/admin-dashboard", "/approvals", "/resources", "/courses", "/users", "/reports"].includes(location.pathname);
  const isAdmin = storedRole === "admin" || (!storedRole && isAdminPath);
  const actualRole = user?.role || (isAdmin ? 'ADMIN' : 'STUDENT');

  const [bookings, setBookings] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      setIsSearching(true);
      apiClient.get(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        .then(res => {
          setSearchResults(res.data);
          setShowSearchDropdown(true);
        })
        .finally(() => setIsSearching(false));
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    if (user) {
      apiClient.get('/api/bookings').then(res => setBookings(res.data)).catch(() => {});
      apiClient.get('/api/equipment').then(res => setEquipment(res.data)).catch(() => {});
    }

    // Kết nối Socket.io để nhận thông báo realtime
    const socket = socketService.connect();
    if (socket) {
      socket.on('notification', (data: any) => {
        if (data.type === 'success') toast.success(data.message, { duration: 4000 });
        else if (data.type === 'error') toast.error(data.message, { duration: 4000 });
        else toast(data.message);

        setNotificationCount(prev => prev + 1);

        // Tự động tải lại danh sách Booking khi có sự thay đổi
        if (user) {
          apiClient.get('/api/bookings').then(res => setBookings(res.data)).catch(() => {});
        }
      });
    }

    return () => {
      socketService.disconnect();
    };
  }, [userStr]);

  const handleAIAction = async (action: string, payload?: any) => {
    try {
      if (action === 'approve-all') {
        await apiClient.put('/api/bookings/approve-all');
        toast.success("Đã phê duyệt tất cả các đơn chờ!");
      } else if (action === 'cancel-booking') {
        if (payload?.id) {
           // Dùng PATCH thay vì PUT theo đúng chuẩn Controller Backend hiện tại
           await apiClient.patch(`/api/bookings/${payload.id}`, { status: "CANCELED" });
           toast.success(`Đã hủy booking #${payload.id}`);
        }
      }
      // Nạp lại danh sách Booking sau khi AI thực hiện action thành công
      apiClient.get('/api/bookings').then(res => setBookings(res.data)).catch(() => {});
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
    "/reports": isAdmin ? t("reports") : "Báo cáo sự cố",
    "/settings": t("settings"),
  };
  const currentPath = location.pathname;
  const pageTitle = breadcrumbMap[currentPath] || t("dashboard");

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] dark:bg-slate-950 text-[#0F172A] dark:text-slate-200 font-sans overflow-hidden transition-colors duration-300">
      {/* Sidebar (240px) */}
      <aside className="w-[240px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-[#E2E8F0] dark:border-slate-800 flex flex-col flex-shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-colors duration-300">
        {/* Logo */}
        <div className="h-[64px] flex items-center gap-3 px-6 border-b border-[#E2E8F0] dark:border-slate-800">
          <img src="/Logo-Dai-Hoc-Viet-Nhat-VJU.png" alt="VJU" className="w-8 h-8 object-contain rounded" />
          <div className="font-bold text-xl bg-gradient-to-r from-[#1E40AF] to-[#3B82F6] bg-clip-text text-transparent">LabBook</div>
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
              <NavItem to="/reports" icon={<AlertTriangle />} label="Báo cáo sự cố" />
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
              <div className="text-[14px] font-semibold text-[#212121] dark:text-slate-200 truncate">
                {user ? user.name : (isAdmin ? "Admin System" : "Nguyễn Văn A")}
              </div>
              <div className="text-[12px] text-[#757575] dark:text-slate-400 truncate">
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
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] dark:bg-slate-950 transition-colors duration-300">
        {/* Topbar (64px) */}
        <header className="h-[64px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between px-6 flex-shrink-0 z-10 sticky top-0 transition-colors duration-300">
          {/* Breadcrumb */}
          <div className="flex items-center text-[14px] font-medium text-[#64748B]">
            Trang chủ <span className="mx-2 text-[#CBD5E1]">/</span> <span className="text-[#0F172A] font-semibold">{pageTitle}</span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder={t("search_placeholder") || "Tìm kiếm..."} 
                className="pl-9 pr-4 py-2 bg-white border border-[#E2E8F0] shadow-sm rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] transition-all w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true); }}
              />
              
              {/* Search Dropdown */}
              {showSearchDropdown && (
                <div className="absolute top-full mt-2 w-full bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 overflow-hidden">
                  {isSearching ? (
                    <div className="p-4 text-center text-sm text-[#64748B]">Đang tìm kiếm...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-sm text-[#64748B]">Không tìm thấy kết quả</div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto py-2">
                      {searchResults.map((item, idx) => (
                        <div 
                          key={`${item.type}-${item.id}-${idx}`}
                          className="flex items-start gap-3 px-4 py-2.5 hover:bg-[#F8FAFC] cursor-pointer border-b border-[#F1F5F9] last:border-0"
                          onClick={() => {
                            setSearchQuery("");
                            setShowSearchDropdown(false);
                            if (item.type === 'ROOM') navigate('/resources');
                            else if (item.type === 'EQUIPMENT') navigate('/resources');
                          }}
                        >
                          <div className={clsx("w-8 h-8 rounded-lg flex flex-shrink-0 items-center justify-center", 
                            item.type === 'ROOM' ? 'bg-[#EFF6FF] text-[#3B82F6]' : 'bg-[#F0FDF4] text-[#22C55E]'
                          )}>
                            {item.type === 'ROOM' ? <Server className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-[#0F172A] truncate">{item.name}</div>
                            <div className="text-[12px] text-[#64748B] truncate">{item.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
            <button 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-slate-800 dark:text-slate-400 rounded-full transition-colors"
              title="Toggle Dark Mode"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              className="relative p-2 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] rounded-full transition-colors"
              onClick={() => setNotificationCount(0)}
            >
              <Bell className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                  {notificationCount}
                </span>
              )}
            </button>
            <div className="h-6 w-px bg-[#E2E8F0] mx-1"></div>
            <button className="flex items-center gap-2 hover:bg-[#F1F5F9] p-1.5 rounded-full transition-colors border border-transparent hover:border-[#E2E8F0]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#DBEAFE] to-[#BFDBFE] text-[#1D4ED8] flex items-center justify-center font-bold text-[13px] shadow-inner">
                {isAdmin ? "AD" : "SV"}
              </div>
              <ChevronDown className="w-4 h-4 text-[#64748B]" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <AnimatePresence mode="wait">
          <motion.main 
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-auto p-[24px]"
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
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
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-[14px] font-medium group",
          isActive
            ? "bg-gradient-to-r from-[#EFF6FF] to-[#DBEAFE] dark:from-blue-900/50 dark:to-blue-800/50 text-[#1D4ED8] dark:text-blue-300 font-semibold shadow-sm border border-[#BFDBFE] dark:border-blue-800"
            : "text-[#475569] dark:text-slate-400 hover:bg-[#F8FAFC] dark:hover:bg-slate-800/50 hover:text-[#0F172A] dark:hover:text-slate-200 border border-transparent"
        )
      }
    >
      <div className={clsx("w-5 h-5 flex items-center justify-center transition-transform duration-200", { "scale-110": location.pathname === to, "group-hover:scale-110": location.pathname !== to })}>{icon}</div>
      <span>{label}</span>
    </NavLink>
  );
}
