import { useState, useEffect } from "react";
import { Search, Edit2, Plus, Users as UsersIcon, Trash2 } from "lucide-react";
import { userService } from "../../services";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ConfirmModal } from "../../components/common/ConfirmModal";
import { toast } from "react-hot-toast";

export function Users() {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "STUDENT" });
  const [editingUser, setEditingUser] = useState({ id: 0, name: "", email: "", role: "STUDENT" });
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState("ALL"); // ALL, BLACKLIST
  const [blacklistingUserId, setBlacklistingUserId] = useState<number | null>(null);
  const [blacklistReason, setBlacklistReason] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const res = await userService.getAll();
      setUsers(res.data || []);
    } catch (error) {
      // apiClient.ts sẽ tự hiển thị toast lỗi
    } finally {
      setIsLoading(false);
    }
  }

  const handleToggleActiveClick = (userId: number, currentStatus: boolean) => {
    if (currentStatus) {
      // Khóa -> Mở Modal nhập lý do
      setBlacklistingUserId(userId);
      setBlacklistReason("");
    } else {
      // Mở khóa -> Gỡ Blacklist
      executeToggleActive(userId, true, "");
    }
  };

  const executeToggleActive = async (userId: number, newStatus: boolean, reason: string) => {
    try {
      await userService.update(userId.toString(), { is_active: newStatus, blacklist_reason: reason });
      toast.success(newStatus ? "Đã gỡ Blacklist thành công" : "Đã thêm vào Blacklist");
      setBlacklistingUserId(null);
      fetchData();
    } catch (error) {
      toast.error("Cập nhật trạng thái thất bại");
    }
  };

  const handleEditClick = (user: any) => {
    setEditingUser({ id: user.id, name: user.name, email: user.email, role: user.role });
    setIsEditingUser(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await userService.update(editingUser.id.toString(), { 
        name: editingUser.name, 
        email: editingUser.email, 
        role: editingUser.role 
      });
      toast.success("Cập nhật thông tin thành công");
      setIsEditingUser(false);
      fetchData();
    } catch (error) {
      toast.error("Cập nhật thất bại");
    }
  };

  const executeDelete = async () => {
    if (deleteConfirmId) {
      try {
        await userService.delete(deleteConfirmId.toString());
        toast.success("Xóa người dùng thành công");
        setDeleteConfirmId(null);
        fetchData();
      } catch (error) {
        toast.error("Xóa thất bại");
      }
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await userService.create({ email: newUser.email, password: newUser.password, fullName: newUser.name, role: newUser.role });
      toast.success("Thêm người dùng thành công");
      setIsAddingUser(false);
      setNewUser({ name: "", email: "", password: "", role: "STUDENT" });
      fetchData();
    } catch (error) {
      // Handled by global interceptor
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Quản trị viên';
      case 'TECHNICIAN': return 'Kỹ thuật viên';
      case 'LECTURER': return 'Giảng viên';
      case 'STUDENT': return 'Sinh viên';
      default: return role;
    }
  };

  const filteredUsers = users.filter(u => 
    ((u.name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.email || "").toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterStatus === "ALL" || (filterStatus === "BLACKLIST" && u.is_active === false))
  );

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <h1 className="text-[24px] font-bold text-[#212121]">Quản lý người dùng</h1>
        <button 
          onClick={() => setIsAddingUser(true)}
          className="flex items-center gap-2 bg-[#1E5FA5] hover:bg-[#154a85] text-white px-4 py-2.5 rounded-md font-medium transition-colors text-[14px]">
          <Plus className="w-4 h-4" /> Thêm tài khoản mới
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#E0E0E0] overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#E0E0E0] bg-[#F5F5F5] flex justify-between items-center">
          <div className="relative w-[300px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#757575]" />
            <input 
              type="text" 
              placeholder="Tìm theo tên, email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#E0E0E0] rounded text-[14px] focus:outline-none focus:border-[#1E5FA5]"
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-white border border-[#E0E0E0] rounded text-[14px] text-[#212121] outline-none"
            >
              <option value="ALL">Tất cả tài khoản</option>
              <option value="BLACKLIST">Danh sách Blacklist</option>
            </select>
            <select className="px-4 py-2 bg-white border border-[#E0E0E0] rounded text-[14px] text-[#212121] outline-none">
              <option>Vai trò (Tất cả)</option>
              <option>Sinh viên</option>
              <option>Giảng viên</option>
              <option>Quản trị viên</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-[#E0E0E0] bg-white">
                <th className="px-6 py-4 text-[13px] font-semibold text-[#757575]">Họ tên</th>
                <th className="px-6 py-4 text-[13px] font-semibold text-[#757575]">ID Hệ thống</th>
                <th className="px-6 py-4 text-[13px] font-semibold text-[#757575]">Email</th>
                <th className="px-6 py-4 text-[13px] font-semibold text-[#757575]">Vai trò</th>
                <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] text-center">Trạng thái</th>
                <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12">
                    <LoadingSpinner text="Đang tải danh sách người dùng..." />
                  </td>
                </tr>
              ) : filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-[#F5F5F5] bg-white transition-colors">
                  <td className="px-6 py-4 text-[14px] font-bold text-[#212121]">
                    {u.name}
                    {u.is_active === false && (
                      <p className="text-[12px] font-normal text-[#C62828] mt-1 bg-[#FDEDED] px-2 py-1 rounded inline-block">
                        Blacklist: {u.blacklist_reason || "Không có lý do"}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-[14px] text-[#757575] font-mono">{u.id}</td>
                  <td className="px-6 py-4 text-[14px] text-[#212121]">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-[#F5F5F5] rounded text-[12px] font-medium text-[#757575]">{getRoleLabel(u.role)}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {u.is_active === false ? (
                      <button 
                        onClick={() => handleToggleActiveClick(u.id, false)}
                        className="px-3 py-1 bg-[#F5F5F5] border border-[#E0E0E0] hover:bg-white text-[#212121] rounded text-[12px] font-medium transition-colors"
                      >
                        Gỡ Blacklist
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleToggleActiveClick(u.id, true)}
                        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors bg-[#1E5FA5]"
                        title="Thêm vào Blacklist"
                      >
                        <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform translate-x-4" />
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleEditClick(u)} className="p-1.5 text-[#757575] hover:text-[#1E5FA5] hover:bg-[#D6E4F7] rounded transition-colors" title="Chỉnh sửa">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteConfirmId(u.id)} className="p-1.5 text-[#757575] hover:text-[#C62828] hover:bg-[#FDEDED] rounded transition-colors" title="Xóa">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#757575]">
                    <UsersIcon className="w-12 h-12 mx-auto mb-3 text-[#E0E0E0]" />
                    <p className="mb-4">Chưa có người dùng nào</p>
                    <button onClick={() => setIsAddingUser(true)} className="px-4 py-2 bg-[#1E5FA5] text-white rounded-md text-[14px]">Thêm tài khoản ngay</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-[20px] font-bold text-[#212121] mb-4">Thêm tài khoản mới</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Họ và tên</label>
                <input required type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md focus:outline-none focus:border-[#1E5FA5]" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Email</label>
                <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md focus:outline-none focus:border-[#1E5FA5]" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Mật khẩu</label>
                <input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md focus:outline-none focus:border-[#1E5FA5]" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Vai trò</label>
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md focus:outline-none focus:border-[#1E5FA5]">
                  <option value="STUDENT">Sinh viên</option>
                  <option value="INSTRUCTOR">Giảng viên</option>
                  <option value="TECHNICIAN">Kỹ thuật viên</option>
                  <option value="ADMIN">Quản trị viên</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsAddingUser(false)} className="px-4 py-2 text-[#757575] hover:bg-[#F5F5F5] rounded-md transition-colors">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-[#1E5FA5] hover:bg-[#154a85] text-white rounded-md transition-colors">Lưu tài khoản</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-[20px] font-bold text-[#212121] mb-4">Sửa thông tin tài khoản</h2>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Họ và tên</label>
                <input required type="text" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md focus:outline-none focus:border-[#1E5FA5]" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Email</label>
                <input required type="email" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md focus:outline-none focus:border-[#1E5FA5]" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Vai trò</label>
                <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md focus:outline-none focus:border-[#1E5FA5]">
                  <option value="STUDENT">Sinh viên</option>
                  <option value="INSTRUCTOR">Giảng viên</option>
                  <option value="TECHNICIAN">Kỹ thuật viên</option>
                  <option value="ADMIN">Quản trị viên</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsEditingUser(false)} className="px-4 py-2 text-[#757575] hover:bg-[#F5F5F5] rounded-md transition-colors">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-[#1E5FA5] hover:bg-[#154a85] text-white rounded-md transition-colors">Cập nhật</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {blacklistingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-[20px] font-bold text-[#C62828] mb-2">Đưa vào Blacklist</h2>
            <p className="text-[14px] text-[#757575] mb-4">Tài khoản này sẽ không thể đăng nhập vào hệ thống cho đến khi được gỡ bỏ.</p>
            <form onSubmit={(e) => { e.preventDefault(); executeToggleActive(blacklistingUserId, false, blacklistReason); }} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Lý do Blacklist (hiển thị cho sinh viên)</label>
                <textarea 
                  required 
                  rows={3}
                  value={blacklistReason} 
                  onChange={e => setBlacklistReason(e.target.value)} 
                  placeholder="Vd: Không đến phòng Lab sau khi đặt quá 3 lần"
                  className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md focus:outline-none focus:border-[#C62828]" 
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setBlacklistingUserId(null)} className="px-4 py-2 text-[#757575] hover:bg-[#F5F5F5] rounded-md transition-colors">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-md transition-colors">Xác nhận Khóa</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        title="Xóa tài khoản"
        message="Bạn có chắc chắn muốn xóa tài khoản này không? Hành động này sẽ xóa các lịch đặt và báo cáo liên quan. Không thể hoàn tác!"
        confirmText="Xóa tài khoản"
        isDestructive={true}
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
