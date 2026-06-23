import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, AlertTriangle, X } from 'lucide-react';
import { chemicalLimitService, courseService, chemicalService } from '../../services';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface ChemicalLimit {
  id: number;
  course_id: number;
  chemical_id: number;
  max_quantity: number;
  unit: string;
  description?: string;
  course: { id: number; name: string; code: string };
  chemical: { id: number; name: string; formula: string; unit: string };
}

interface Course {
  id: number;
  name: string;
  code: string;
}

interface Chemical {
  id: number;
  name: string;
  formula?: string;
  unit: string;
}

export function LimitManagement() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'chemicals' | 'tools'>('chemicals');
  const [limits, setLimits] = useState<ChemicalLimit[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLimit, setEditingLimit] = useState<ChemicalLimit | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    course_id: 0,
    chemical_id: 0,
    max_quantity: 0,
    unit: '',
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [limitsRes, coursesRes, chemicalsRes] = await Promise.all([
        chemicalLimitService.getAll(),
        courseService.getAll(),
        chemicalService.getAll(),
      ]);
      setLimits(limitsRes.data || []);
      setCourses(coursesRes.data || []);
      setChemicals(chemicalsRes.data || []);
    } catch (error) {
      toast.error('Lỗi tải dữ liệu định mức');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.course_id || !formData.chemical_id || formData.max_quantity <= 0) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      await chemicalLimitService.create(formData);
      toast.success('Thêm định mức thành công');
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Lỗi khi thêm định mức';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  const handleUpdate = async () => {
    if (!editingLimit || formData.max_quantity <= 0) {
      toast.error('Số lượng tối đa phải lớn hơn 0');
      return;
    }

    try {
      await chemicalLimitService.update(editingLimit.id, {
        max_quantity: formData.max_quantity,
        unit: formData.unit,
        description: formData.description,
      });
      toast.success('Cập nhật định mức thành công');
      setEditingLimit(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Lỗi khi cập nhật định mức');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await chemicalLimitService.delete(id);
      toast.success('Xóa định mức thành công');
      setDeleteConfirm(null);
      fetchData();
    } catch (error) {
      toast.error('Lỗi khi xóa định mức');
    }
  };

  const openEdit = (limit: ChemicalLimit) => {
    setEditingLimit(limit);
    setFormData({
      course_id: limit.course_id,
      chemical_id: limit.chemical_id,
      max_quantity: limit.max_quantity,
      unit: limit.unit,
      description: limit.description || '',
    });
  };

  const resetForm = () => {
    setFormData({
      course_id: 0,
      chemical_id: 0,
      max_quantity: 0,
      unit: '',
      description: '',
    });
  };

  const filteredLimits = limits.filter((limit) => {
    const search = searchTerm.toLowerCase();
    return (
      limit.course?.name?.toLowerCase().includes(search) ||
      limit.course?.code?.toLowerCase().includes(search) ||
      limit.chemical?.name?.toLowerCase().includes(search) ||
      limit.chemical?.formula?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-slate-950">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[20px] font-bold text-[#0F172A] dark:text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
            Quản lý Định mức Hóa chất
          </h2>
          <p className="text-[13px] text-[#64748B] dark:text-slate-400 mt-1">
            {t('set_limit_for_course', 'Thiết lập giới hạn sử dụng hóa chất theo từng học phần để đảm bảo an toàn.')}
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-lg text-[14px] font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm định mức
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder={t('search_course_chemical', 'Tìm kiếm theo học phần, mã hóa chất...')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <LoadingSpinner />
        </div>
      ) : filteredLimits.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-12">
          <AlertTriangle className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Chưa có định mức nào được thiết lập</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 text-blue-600 hover:underline text-[14px]"
          >
            Thêm định mức đầu tiên
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-left text-[12px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {t('course', 'Học phần')}
                  </th>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Hóa chất
                  </th>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Định mức
                  </th>
                  <th className="px-4 py-3 text-left text-[12px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Mô tả
                  </th>
                  <th className="px-4 py-3 text-right text-[12px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLimits.map((limit) => (
                  <tr
                    key={limit.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-[14px] text-slate-900 dark:text-slate-200">
                          {limit.course?.name}
                        </p>
                        <p className="text-[12px] text-slate-500">{limit.course?.code}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-[14px] text-slate-900 dark:text-slate-200">
                          {limit.chemical?.name}
                        </p>
                        <p className="text-[12px] text-slate-500">
                          {limit.chemical?.formula} ({limit.unit})
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[14px] text-slate-900 dark:text-slate-200">
                          {limit.max_quantity}
                        </span>
                        <span className="text-[12px] text-slate-500">{limit.unit}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[14px] text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {limit.description || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(limit)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(limit.id)}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingLimit) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-[16px] font-semibold text-slate-900 dark:text-slate-100">
                {editingLimit ? 'Chỉnh sửa định mức' : 'Thêm định mức mới'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingLimit(null);
                  resetForm();
                }}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {!editingLimit && (
                <>
                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {t('course', 'Học phần')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.course_id}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          course_id: Number(e.target.value),
                        });
                      }}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={0}>-- {t('select_course', 'Chọn học phần')} --</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name} ({course.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Hóa chất <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.chemical_id}
                      onChange={(e) => {
                        const chemical = chemicals.find((c) => c.id === Number(e.target.value));
                        setFormData({
                          ...formData,
                          chemical_id: Number(e.target.value),
                          unit: chemical?.unit || '',
                        });
                      }}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={0}>-- Chọn hóa chất --</option>
                      {chemicals.map((chemical) => (
                        <option key={chemical.id} value={chemical.id}>
                          {chemical.name} {chemical.formula ? `(${chemical.formula})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Số lượng tối đa <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={formData.max_quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, max_quantity: Number(e.target.value) })
                    }
                    className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ví dụ: 100"
                    min="0"
                    step="0.01"
                  />
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-24 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="đơn vị"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Ghi chú thêm về định mức này..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingLimit(null);
                  resetForm();
                }}
                className="px-4 py-2 text-[14px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={editingLimit ? handleUpdate : handleAdd}
                className="px-4 py-2 text-[14px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                {editingLimit ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm !== null}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Xóa định mức"
        message="Bạn có chắc chắn muốn xóa định mức này? Hành động này không thể hoàn tác."
        confirmText="Xóa"
        isDestructive={true}
      />
    </div>
  );
}