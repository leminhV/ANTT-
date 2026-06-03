import { useState, useEffect } from "react";
import { Search, Edit2, Plus, Trash2, BookOpen, X } from "lucide-react";
import { courseService, userService } from "../../services";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ConfirmModal } from "../../components/common/ConfirmModal";
import { toast } from "react-hot-toast";
import { format } from "date-fns";

export function Courses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({ id: 0, code: "", name: "", instructor_id: "" });
  const [isEditing, setIsEditing] = useState(false);

  const currentUserStr = localStorage.getItem("user");
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const isAdminOrTechnician = currentUser?.role === 'ADMIN' || currentUser?.role === 'TECHNICIAN';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [coursesRes, usersRes] = await Promise.all([
        courseService.getAll(),
        userService.getAll()
      ]);
      setCourses(coursesRes.data || []);
      
      const allUsers = usersRes.data || [];
      const instrs = allUsers.filter((u: any) => u.role === 'INSTRUCTOR' || u.role === 'ADMIN');
      setInstructors(instrs);
    } catch (error) {
      // apiClient.ts đã xử lý toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (course?: any) => {
    if (course) {
      setFormData({
        id: course.id,
        code: course.code,
        name: course.name,
        instructor_id: course.instructor_id.toString()
      });
      setIsEditing(true);
    } else {
      setFormData({ id: 0, code: "", name: "", instructor_id: "" });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        code: formData.code,
        name: formData.name,
        instructor_id: parseInt(formData.instructor_id)
      };

      if (isEditing) {
        await courseService.update(formData.id.toString(), payload);
        toast.success("Cập nhật học phần thành công");
      } else {
        await courseService.create(payload);
        toast.success("Thêm mới học phần thành công");
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(isEditing ? "Cập nhật thất bại" : "Thêm mới thất bại");
    }
  };

  const executeDelete = async () => {
    if (deleteConfirmId) {
      try {
        await courseService.delete(deleteConfirmId.toString());
        toast.success("Xóa học phần thành công");
        setDeleteConfirmId(null);
        fetchData();
      } catch (error) {
        toast.error("Không thể xóa học phần. Có thể đang có lịch liên quan.");
      }
    }
  };

  const filteredCourses = courses.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-300 pb-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-[24px] font-bold text-[#212121] mb-2">Quản lý Học Phần</h1>
          <p className="text-[#757575] text-[14px]">Theo dõi các môn học và phân công giảng viên</p>
        </div>
        {isAdminOrTechnician && (
          <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-[#1E5FA5] hover:bg-[#154a85] text-white px-4 py-2.5 rounded-md font-medium transition-colors text-[14px] shadow-sm">
            <Plus className="w-4 h-4" /> Thêm học phần mới
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#E0E0E0] overflow-hidden">
        <div className="p-4 border-b border-[#E0E0E0] bg-[#FAFAFA] flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#757575]" />
            <input 
              type="text" 
              placeholder="Tìm theo mã hoặc tên môn..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#E0E0E0] rounded text-[14px] focus:outline-none focus:border-[#1E5FA5]" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E0E0E0] bg-[#F5F5F5]">
                <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] w-[15%]">Mã học phần</th>
                <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] w-[35%]">Tên môn học</th>
                <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] w-[25%]">Giảng viên phụ trách</th>
                <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] w-[15%]">Ngày tạo</th>
                {isAdminOrTechnician && <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] text-right">Hành động</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {isLoading ? (
                <tr><td colSpan={5} className="py-12"><LoadingSpinner text="Đang tải dữ liệu..." /></td></tr>
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#757575]">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 text-[#E0E0E0]" />
                    <p>Không tìm thấy học phần nào</p>
                  </td>
                </tr>
              ) : filteredCourses.map((c) => (
                <tr key={c.id} className="hover:bg-[#F5F5F5] transition-colors">
                  <td className="px-6 py-4 text-[14px] font-bold text-[#1E5FA5]">{c.code}</td>
                  <td className="px-6 py-4 text-[14px] font-medium text-[#212121]">{c.name}</td>
                  <td className="px-6 py-4 text-[14px] text-[#212121]">{c.instructor?.name || 'Chưa phân công'}</td>
                  <td className="px-6 py-4 text-[14px] text-[#757575]">{format(new Date(c.created_at), "dd/MM/yyyy")}</td>
                  {isAdminOrTechnician && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleOpenModal(c)} className="p-1.5 text-[#757575] hover:text-[#1E5FA5] hover:bg-[#D6E4F7] rounded transition-colors" title="Chỉnh sửa">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirmId(c.id)} className="p-1.5 text-[#757575] hover:text-[#C62828] hover:bg-[#FDEDED] rounded transition-colors" title="Xóa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#E0E0E0] flex justify-between items-center bg-[#FAFAFA]">
              <h3 className="font-bold text-[#212121] text-[16px]">{isEditing ? 'Sửa học phần' : 'Thêm học phần mới'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-[#757575] hover:bg-[#E0E0E0] rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Mã học phần <span className="text-red-500">*</span></label>
                <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5]" placeholder="Vd: IT101" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Tên môn học <span className="text-red-500">*</span></label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5]" placeholder="Vd: Lập trình C++" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Giảng viên phụ trách <span className="text-red-500">*</span></label>
                <select required value={formData.instructor_id} onChange={e => setFormData({...formData, instructor_id: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5]">
                  <option value="">-- Chọn giảng viên --</option>
                  {instructors.map(i => <option key={i.id} value={i.id}>{i.name} ({i.email})</option>)}
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-[#E0E0E0]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[14px] font-medium text-[#757575] hover:bg-[#F5F5F5] rounded-md transition-colors">Hủy</button>
                <button type="submit" className="px-4 py-2 text-[14px] font-bold text-white bg-[#1E5FA5] hover:bg-[#154a85] rounded-md transition-colors">{isEditing ? 'Cập nhật' : 'Tạo mới'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        title="Xóa học phần"
        message="Bạn có chắc chắn muốn xóa học phần này không? Hành động này không thể hoàn tác!"
        confirmText="Xóa học phần"
        isDestructive={true}
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
