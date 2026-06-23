import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Package, Layers } from 'lucide-react';
import { StatMini } from '../../components/ui/StatMini';
import { comboService } from '../../services';
import { toast } from 'react-hot-toast';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export function CombosManagement() {  const [combos, setCombos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCombos();
  }, []);

  const fetchCombos = async () => {
    try {
      setIsLoading(true);
      const res = await comboService.getAll();
      setCombos(res.data);
    } catch (error) {
      toast.error('Lỗi tải danh sách Combo');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCombos = combos.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-slate-950">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[20px] font-bold text-[#0F172A] dark:text-slate-100 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-500" />
            Quản lý Combo / Bộ thiết bị
          </h2>
          <p className="text-[13px] text-[#64748B] dark:text-slate-400 mt-1">
            Quản lý các bộ dụng cụ cấp phát sẵn cho sinh viên mượn thực hành.
          </p>
        </div>
        <button
          onClick={() => toast.success('Tính năng thêm combo đang được phát triển')}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl text-[14px] font-bold flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          Thêm Combo mới
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatMini
          label="Tổng số Combo"
          value={combos.length}
          icon={<Package className="w-5 h-5" />}
          color="text-indigo-600"
          bgColor="bg-indigo-600"
        />
        <StatMini
          label="Tổng thiết bị"
          value={combos.reduce((acc, c) => acc + (c.items?.length || 0), 0)}
          icon={<Layers className="w-5 h-5" />}
          color="text-emerald-600"
          bgColor="bg-emerald-600"
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm dark:shadow-slate-900/50 border border-[#E0E0E0] dark:border-slate-800 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[#E0E0E0]/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-md flex justify-between">
          <div className="relative w-[300px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#757575] dark:text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên combo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-[#E0E0E0] dark:border-slate-800 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto min-h-0">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : filteredCombos.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-[#64748B] dark:text-slate-400">
              <Package className="w-12 h-12 mb-3 opacity-20 text-[#E0E0E0]" />
              <p>Chưa có combo nào được tạo.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E0E0E0]/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm sticky top-0 z-10">
                  <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] dark:text-slate-400 w-[30%]">
                    Tên Combo
                  </th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] dark:text-slate-400 w-[40%]">
                    Mô tả
                  </th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] dark:text-slate-400 w-[20%] text-center">
                    Số lượng thiết bị
                  </th>
                  <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] dark:text-slate-400 text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E0E0] dark:divide-slate-800">
                {filteredCombos.map(combo => (
                  <tr key={combo.id} className="hover:bg-[#F5F5F5] dark:hover:bg-slate-800 dark:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-[14px] font-bold text-[#1E5FA5] dark:text-blue-400">
                      {combo.name}
                    </td>
                    <td className="px-6 py-4 text-[14px] text-[#212121] dark:text-slate-100">
                      {combo.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-[14px] text-center">
                      <span className="font-semibold text-[#212121] dark:text-slate-100">
                        {combo.items?.length || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button className="p-1.5 text-[#757575] dark:text-slate-400 hover:text-[#1E5FA5] dark:text-blue-400 hover:bg-[#D6E4F7] dark:bg-blue-900/30 rounded transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-[#757575] dark:text-slate-400 hover:text-[#C62828] hover:bg-[#FDEDED] dark:bg-red-900/30 rounded transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
