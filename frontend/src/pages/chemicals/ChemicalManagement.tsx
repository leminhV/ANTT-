import { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, Beaker, ClipboardList, X } from "lucide-react";
import { chemicalService } from "../../services";
import { ConfirmModal } from "../../components/common/ConfirmModal";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { toast } from "react-hot-toast";

export function ChemicalManagement() {
  const [chemicals, setChemicals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [formData, setFormData] = useState({ id: 0, name: "", formula: "", quantity_stock: 0, unit: "ml", expiration_date: "" });
  const [isEditing, setIsEditing] = useState(false);
  
  const [usageData, setUsageData] = useState({ chemical_id: 0, booking_id: 1, quantity_used: 0 }); // booking_id = 1 as placeholder for demo

  useEffect(() => {
    fetchChemicals();
  }, []);

  const fetchChemicals = async () => {
    setIsLoading(true);
    try {
      const res = await chemicalService.getAll();
      setChemicals(res.data || []);
    } catch {
      toast.error("Lỗi khi tải dữ liệu hóa chất");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (chemical?: any) => {
    if (chemical) {
      setFormData({
        id: chemical.id,
        name: chemical.name,
        formula: chemical.formula || "",
        quantity_stock: chemical.quantity_stock,
        unit: chemical.unit,
        expiration_date: chemical.expiration_date ? new Date(chemical.expiration_date).toISOString().split('T')[0] : ""
      });
      setIsEditing(true);
    } else {
      setFormData({ id: 0, name: "", formula: "", quantity_stock: 0, unit: "ml", expiration_date: "" });
      setIsEditing(false);
    }
    setIsModalOpen(true);
  };

  const handleOpenUsageModal = (chemical: any) => {
    setUsageData({ chemical_id: chemical.id, booking_id: 1, quantity_used: 0 });
    setIsUsageModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        quantity_stock: Number(formData.quantity_stock),
        expiration_date: formData.expiration_date ? new Date(formData.expiration_date).toISOString() : undefined
      };
      
      if (isEditing) {
        await chemicalService.update(formData.id.toString(), payload);
        toast.success("Cập nhật hóa chất thành công");
      } else {
        await chemicalService.create(payload);
        toast.success("Thêm mới hóa chất thành công");
      }
      setIsModalOpen(false);
      fetchChemicals();
    } catch {
      toast.error(isEditing ? "Cập nhật thất bại" : "Thêm mới thất bại");
    }
  };

  const handleRecordUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await chemicalService.recordUsage({
        chemicalId: usageData.chemical_id.toString(),
        bookingId: usageData.booking_id.toString(),
        amountUsed: Number(usageData.quantity_used)
      });
      toast.success("Ghi nhận sử dụng thành công!");
      setIsUsageModalOpen(false);
      fetchChemicals();
    } catch {
      toast.error("Có lỗi xảy ra hoặc số lượng không đủ");
    }
  };

  const executeDelete = async () => {
    if (deleteConfirmId) {
      try {
        await chemicalService.delete(deleteConfirmId.toString());
        toast.success("Xóa hóa chất thành công");
        setDeleteConfirmId(null);
        fetchChemicals();
      } catch {
        toast.error("Xóa thất bại. Hóa chất này có thể đang có lịch sử sử dụng.");
      }
    }
  };

  const filteredChemicals = chemicals.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.formula && c.formula.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#E0E0E0] flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-[#E0E0E0] bg-[#F5F5F5] flex justify-between">
        <div className="relative w-[300px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#757575]" />
          <input 
            type="text" 
            placeholder="Tìm theo tên, công thức..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E0E0E0] rounded text-[14px] focus:outline-none focus:border-[#1E5FA5]"
          />
        </div>
        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-[#1E5FA5] hover:bg-[#154a85] text-white px-4 py-2 rounded-md font-medium transition-colors text-[14px]">
          <Plus className="w-4 h-4" /> Thêm Hóa chất
        </button>
      </div>
      
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E0E0E0] bg-white sticky top-0">
              <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] w-[20%]">Tên hóa chất</th>
              <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] w-[15%]">Công thức</th>
              <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] w-[15%] text-right">Tồn kho</th>
              <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] w-[15%] text-center">Đơn vị</th>
              <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] w-[15%]">Hạn sử dụng</th>
              <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E0E0E0]">
            {isLoading ? (
              <tr><td colSpan={6} className="py-12"><LoadingSpinner text="Đang tải dữ liệu..." /></td></tr>
            ) : filteredChemicals.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#757575]">
                  <Beaker className="w-12 h-12 mx-auto mb-3 text-[#E0E0E0]" />
                  <p>Không tìm thấy hóa chất nào</p>
                </td>
              </tr>
            ) : filteredChemicals.map((c) => {
              const isLowStock = c.quantity_stock <= 5;
              return (
              <tr key={c.id} className="hover:bg-[#F5F5F5] transition-colors">
                <td className="px-6 py-4 text-[14px] font-bold text-[#1E5FA5]">{c.name}</td>
                <td className="px-6 py-4 text-[14px] text-[#212121]">{c.formula || '-'}</td>
                <td className="px-6 py-4 text-[14px] text-right">
                  <span className={`font-semibold ${isLowStock ? 'text-red-500' : 'text-[#212121]'}`}>{c.quantity_stock}</span>
                </td>
                <td className="px-6 py-4 text-[14px] text-center text-[#757575]">{c.unit}</td>
                <td className="px-6 py-4 text-[14px] text-[#757575]">
                  {c.expiration_date ? new Date(c.expiration_date).toLocaleDateString('vi-VN') : '-'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => handleOpenUsageModal(c)} className="p-1.5 text-[#757575] hover:text-[#2E7D32] hover:bg-[#E8F5E9] rounded transition-colors" title="Ghi nhận sử dụng">
                      <ClipboardList className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleOpenModal(c)} className="p-1.5 text-[#757575] hover:text-[#1E5FA5] hover:bg-[#D6E4F7] rounded transition-colors" title="Chỉnh sửa">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteConfirmId(c.id)} className="p-1.5 text-[#757575] hover:text-[#C62828] hover:bg-[#FDEDED] rounded transition-colors" title="Xóa">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-[#E0E0E0] flex justify-between items-center bg-[#FAFAFA]">
              <h3 className="font-bold text-[#212121] text-[16px]">{isEditing ? 'Sửa thông tin hóa chất' : 'Thêm hóa chất mới'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-[#757575] hover:bg-[#E0E0E0] rounded transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Tên hóa chất <span className="text-red-500">*</span></label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md text-[14px]" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Công thức hóa học</label>
                <input type="text" value={formData.formula} onChange={e => setFormData({...formData, formula: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md text-[14px]" placeholder="Vd: H2SO4" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[13px] font-medium text-[#757575] mb-1">Số lượng tồn <span className="text-red-500">*</span></label>
                  <input required type="number" step="0.1" value={formData.quantity_stock} onChange={e => setFormData({...formData, quantity_stock: Number(e.target.value)})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md text-[14px]" />
                </div>
                <div className="w-1/3">
                  <label className="block text-[13px] font-medium text-[#757575] mb-1">Đơn vị <span className="text-red-500">*</span></label>
                  <select required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md text-[14px]">
                    <option value="ml">ml</option>
                    <option value="l">l</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Hạn sử dụng</label>
                <input type="date" value={formData.expiration_date} onChange={e => setFormData({...formData, expiration_date: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md text-[14px]" />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-[#E0E0E0]">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-[#757575] hover:bg-[#F5F5F5] rounded-md transition-colors text-[14px]">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-[#1E5FA5] hover:bg-[#154a85] text-white rounded-md transition-colors text-[14px]">{isEditing ? 'Cập nhật' : 'Thêm mới'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isUsageModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-[#E0E0E0] flex justify-between items-center bg-[#FAFAFA]">
              <h3 className="font-bold text-[#212121] text-[16px]">Ghi nhận sử dụng</h3>
              <button onClick={() => setIsUsageModalOpen(false)} className="p-1.5 text-[#757575] hover:bg-[#E0E0E0] rounded transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleRecordUsage} className="p-6 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Mã lịch đặt (Booking ID)</label>
                <input required type="number" value={usageData.booking_id} onChange={e => setUsageData({...usageData, booking_id: Number(e.target.value)})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md text-[14px]" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Số lượng sử dụng <span className="text-red-500">*</span></label>
                <input required type="number" step="0.1" value={usageData.quantity_used} onChange={e => setUsageData({...usageData, quantity_used: Number(e.target.value)})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md text-[14px]" />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-[#E0E0E0]">
                <button type="button" onClick={() => setIsUsageModalOpen(false)} className="px-4 py-2 text-[#757575] hover:bg-[#F5F5F5] rounded-md transition-colors text-[14px]">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-md transition-colors text-[14px]">Ghi nhận</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        title="Xóa hóa chất"
        message="Bạn có chắc chắn muốn xóa hóa chất này không? Hành động này không thể hoàn tác!"
        confirmText="Xóa hóa chất"
        isDestructive={true}
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}
