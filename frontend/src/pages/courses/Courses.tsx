import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Edit2, Plus, Trash2, BookOpen, X, User, Send } from 'lucide-react';
import { courseService } from '../../services';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { useCourses } from '../../hooks/useCourses';
import { StatMini } from '../../components/ui/StatMini';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { ICourse } from '../../types/models';
import { useAuthStore } from '../../store/authStore';

export function Courses() {
  const { t } = useTranslation();

  const { courses, instructors, isLoading, refetch, canManage, isAdminOrTechnician } = useCourses();
  const { user: currentUser } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [requestDeleteId, setRequestDeleteId] = useState<number | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  // Form state
  const [formData, setFormData] = useState({ id: 0, code: '', name: '', instructor_id: '', semester: 'Kỳ 1', academic_year: '2025-2026' });
  const [isEditing, setIsEditing] = useState(false);

  const handleOpenModal = (course?: ICourse) => {
    if (course) {
      setFormData({
        id: course.id,
        code: course.code,
        name: course.name,
        instructor_id: course.instructor_id.toString(),
        semester: course.semester || 'Kỳ 1',
        academic_year: course.academic_year || '2025-2026',
      });
      setIsEditing(true);
    } else {
      setFormData({ id: 0, code: '', name: '', instructor_id: '', semester: 'Kỳ 1', academic_year: '2025-2026' });
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
        instructor_id: parseInt(formData.instructor_id),
        semester: formData.semester,
        academic_year: formData.academic_year,
      };

      if (isEditing) {
        await courseService.update(formData.id.toString(), payload);
        toast.success(t('update_course_success'));
      } else {
        await courseService.create(payload);
        toast.success(t('create_course_success'));
      }
      setIsModalOpen(false);
      refetch();
    } catch (error: unknown) {
      const err = error as any;
      const msg = err.response?.data?.message || (isEditing ? t('update_failed') : t('add_failed'));
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  const executeDelete = async () => {
    if (deleteConfirmId) {
      try {
        await courseService.delete(deleteConfirmId.toString());
        toast.success(t('delete_course_success'));
        setDeleteConfirmId(null);
        refetch();
      } catch (error: unknown) {
        const err = error as any;
        const msg = err.response?.data?.message || t('delete_course_error');
        toast.error(Array.isArray(msg) ? msg[0] : msg);
      }
    }
  };

  const executeRequestDelete = async () => {
    if (requestDeleteId && deleteReason.trim()) {
      try {
        await courseService.requestDelete(requestDeleteId.toString(), deleteReason);
        toast.success('Yêu cầu xóa đã được gửi đến Admin');
        setRequestDeleteId(null);
        setDeleteReason('');
      } catch (error: unknown) {
        const err = error as any;
        const msg = err.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu';
        toast.error(Array.isArray(msg) ? msg[0] : msg);
      }
    } else {
      toast.error('Vui lòng nhập lý do xóa');
    }
  };

  const filteredCourses = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = useMemo(() => {
    const uniqueInstructors = new Set(courses.map((c) => c.instructor?.id)).size;
    return {
      total: courses.length,
      instructors: uniqueInstructors,
    };
  }, [courses]);

  return (
    <div className="max-w-[1200px] w-full mx-auto animate-in fade-in duration-300 h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-[24px] font-bold text-[#212121] dark:text-slate-100 mb-2">
              {t('manage_courses')}
            </h1>
            <p className="text-[#757575] dark:text-slate-400 text-[14px]">
              {t('manage_courses_desc')}
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5 text-[14px]"
            >
              <Plus className="w-4 h-4" /> {t('add_new_course')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[600px]">
          <StatMini
            label={t('total_courses', 'Tổng học phần')}
            value={stats.total}
            icon={<BookOpen className="w-5 h-5" />}
            color="text-indigo-600"
            bgColor="bg-indigo-600"
          />
          <StatMini
            label={t('total_instructors_involved', 'Giảng viên tham gia')}
            value={stats.instructors}
            icon={<User className="w-5 h-5" />}
            color="text-teal-600"
            bgColor="bg-teal-600"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm dark:shadow-slate-900/50 border border-[#E0E0E0] dark:border-slate-800 flex flex-col flex-1 min-h-0">
        <div className="p-4 border-b border-[#E0E0E0]/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-md flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#757575] dark:text-slate-400" />
            <input
              type="text"
              placeholder={t('search_course_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-[#E0E0E0] dark:border-slate-800 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="overflow-auto flex-1 min-h-0 scrollbar-thin scrollbar-thumb-[#E0E0E0] dark:scrollbar-thumb-slate-700">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E0E0E0]/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm sticky top-0 z-10">
                <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] dark:text-slate-400 w-[15%]">
                  {t('course_code')}
                </th>
                <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] dark:text-slate-400 w-[20%]">
                  {t('course_name')}
                </th>
                <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] dark:text-slate-400 w-[15%]">
                  Học kỳ
                </th>
                <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] dark:text-slate-400 w-[20%]">
                  {t('course_instructor')}
                </th>
                <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] dark:text-slate-400 w-[15%]">
                  {t('created_date')}
                </th>
                {canManage && (
                  <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] dark:text-slate-400 text-right">
                    {t('action')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0] dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12">
                    <LoadingSpinner text={t('loading_data')} />
                  </td>
                </tr>
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#757575] dark:text-slate-400">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 text-[#E0E0E0]" />
                    <p>{t('no_courses_found')}</p>
                  </td>
                </tr>
              ) : (
                filteredCourses.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-[#F5F5F5] dark:hover:bg-slate-800 dark:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-[14px] font-bold text-[#1E5FA5] dark:text-blue-400">
                      {c.code}
                    </td>
                    <td className="px-6 py-4 text-[14px] font-medium text-[#212121] dark:text-slate-100">
                      {c.name}
                    </td>
                    <td className="px-6 py-4 text-[14px] text-[#212121] dark:text-slate-100">
                      {c.semester} <span className="text-[#757575]">({c.academic_year})</span>
                    </td>
                    <td className="px-6 py-4 text-[14px] text-[#212121] dark:text-slate-100">
                      {c.instructor?.name || t('unassigned')}
                    </td>
                    <td className="px-6 py-4 text-[14px] text-[#757575] dark:text-slate-400">
                      {format(new Date(c.created_at), 'dd/MM/yyyy')}
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          {(isAdminOrTechnician || (currentUser?.role === 'INSTRUCTOR' && currentUser?.id === c.instructor_id)) && (
                            <button
                              onClick={() => handleOpenModal(c)}
                              className="p-1.5 text-[#757575] dark:text-slate-400 hover:text-[#1E5FA5] dark:text-blue-400 hover:bg-[#D6E4F7] dark:bg-blue-900/30 rounded transition-colors"
                              title={t('edit')}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {isAdminOrTechnician && (
                            <button
                              onClick={() => setDeleteConfirmId(c.id)}
                              className="p-1.5 text-[#757575] dark:text-slate-400 hover:text-[#C62828] hover:bg-[#FDEDED] dark:bg-red-900/30 rounded transition-colors"
                              title={t('delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          {!isAdminOrTechnician && currentUser?.role === 'INSTRUCTOR' && currentUser?.id === c.instructor_id && (
                            <button
                              onClick={() => setRequestDeleteId(c.id)}
                              className="p-1.5 text-[#757575] dark:text-slate-400 hover:text-orange-600 hover:bg-orange-100 dark:bg-orange-900/30 rounded transition-colors"
                              title="Yêu cầu xóa"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl dark:shadow-slate-900/50 w-full max-w-md overflow-hidden border border-white/20 dark:border-slate-700/50 animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#E0E0E0]/50 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
              <h3 className="font-bold text-[#212121] dark:text-slate-100 text-[16px]">
                {isEditing ? t('edit_course') : t('add_new_course')}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-[#757575] dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                  {t('course_code', 'Mã học phần')} <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-[#E0E0E0] dark:border-slate-800 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder={t('ex_course_code')}
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                  Tên môn học <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-[#E0E0E0] dark:border-slate-800 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder={t('ex_course_name')}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                    Học kỳ
                  </label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-[#E0E0E0] dark:border-slate-800 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  >
                    <option value="Kỳ 1">Kỳ 1</option>
                    <option value="Kỳ 2">Kỳ 2</option>
                    <option value="Kỳ Hè">Kỳ Hè</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                    Năm học
                  </label>
                  <input
                    type="text"
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    className="w-full px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-[#E0E0E0] dark:border-slate-800 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="VD: 2024-2025"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                  Giảng viên phụ trách <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.instructor_id}
                  onChange={(e) => setFormData({ ...formData, instructor_id: e.target.value })}
                  className="w-full px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-[#E0E0E0] dark:border-slate-800 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="">{t('select_instructor')}</option>
                  {instructors.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-[#E0E0E0]/50 dark:border-slate-800/50 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-[14px] font-medium text-[#757575] dark:text-slate-400 hover:bg-[#F5F5F5] dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-[14px] font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5"
                >
                  {isEditing ? t('update_btn') : t('create_new')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        title={t('delete_course')}
        message={t('delete_course_confirm')}
        confirmText={t('delete_course')}
        isDestructive={true}
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {requestDeleteId !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl dark:shadow-slate-900/50 w-full max-w-md overflow-hidden border border-white/20 dark:border-slate-700/50 animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#E0E0E0]/50 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
              <h3 className="font-bold text-[#212121] dark:text-slate-100 text-[16px]">
                {t('request_delete_course', 'Yêu cầu xóa học phần')}
              </h3>
              <button
                onClick={() => {
                  setRequestDeleteId(null);
                  setDeleteReason('');
                }}
                className="p-1.5 text-[#757575] dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[14px] text-[#757575] dark:text-slate-400">
                {t('cannot_delete_course_directly', 'Bạn không có quyền trực tiếp xóa học phần này. Vui lòng nhập lý do xóa để gửi yêu cầu đến Quản trị viên.')}
              </p>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                  Lý do xóa <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-[#E0E0E0] dark:border-slate-800 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                  placeholder={t('delete_course_reason_placeholder', 'Ví dụ: Học phần này bị hủy do không đủ số lượng sinh viên...')}
                />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-[#E0E0E0]/50 dark:border-slate-800/50 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setRequestDeleteId(null);
                    setDeleteReason('');
                  }}
                  className="px-4 py-2 text-[14px] font-medium text-[#757575] dark:text-slate-400 hover:bg-[#F5F5F5] dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={executeRequestDelete}
                  className="px-4 py-2 text-[14px] font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-lg transition-all duration-300 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5"
                >
                  Gửi yêu cầu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
