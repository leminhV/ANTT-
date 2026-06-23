import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, DollarSign, Target, Award, FileText, Search, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { investmentService, publicationService, roomService } from '../../services';
import { toast } from 'react-hot-toast';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export function StrategicManagement() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'investment' | 'publication' | 'roi'>('investment');
  const [searchTerm, setSearchTerm] = useState('');

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === 'ADMIN';

  const [investments, setInvestments] = useState<any[]>([]);
  const [publications, setPublications] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formType, setFormType] = useState<'investment' | 'publication'>('investment');

  // Forms state
  const [invForm, setInvForm] = useState({ room_id: '', amount: '', year: new Date().getFullYear().toString(), source: '', description: '' });
  const [pubForm, setPubForm] = useState({
    title: '',
    authors: '',
    journal: '',
    year: new Date().getFullYear().toString(),
    doi: '',
    category: '',
    room_id: '',
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'investment' | 'publication';
    id: number | null;
  }>({
    isOpen: false,
    type: 'investment',
    id: null,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [invRes, pubRes, roomRes] = await Promise.all([
        investmentService.getAll(),
        publicationService.getAll(),
        roomService.getAll(),
      ]);
      setInvestments(invRes.data || []);
      setPublications(pubRes.data || []);
      setRooms(roomRes.data || []);
    } catch (error) {
      toast.error('Lỗi khi tải dữ liệu chiến lược');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAdd = (type: 'investment' | 'publication') => {
    setFormType(type);
    if (type === 'investment') setInvForm({ room_id: '', amount: '', year: new Date().getFullYear().toString(), source: '', description: '' });
    else
      setPubForm({
        title: '',
        authors: '',
        journal: '',
        year: new Date().getFullYear().toString(),
        doi: '',
        category: '',
        room_id: '',
      });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formType === 'investment') {
        await investmentService.create({
          room_id: parseInt(invForm.room_id),
          amount: parseFloat(invForm.amount),
          year: parseInt(invForm.year),
          source: invForm.source,
          description: invForm.description
        });
        toast.success(t('add_investment_success'));
      } else {
        await publicationService.create({
          ...pubForm,
          year: parseInt(pubForm.year),
          room_id: parseInt(pubForm.room_id),
        });
        toast.success(t('add_publication_success'));
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Thêm dữ liệu thất bại');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      if (deleteConfirm.type === 'investment') {
        await investmentService.delete(deleteConfirm.id.toString());
        toast.success('Đã xóa khoản đầu tư');
      } else {
        await publicationService.delete(deleteConfirm.id);
        toast.success('Đã xóa công bố khoa học');
      }
      fetchData();
    } catch (error) {
      toast.error('Xóa thất bại');
    } finally {
      setDeleteConfirm({ isOpen: false, type: 'investment', id: null });
    }
  };

  const handleExportExcel = async () => {
    try {
      const toastId = toast.loading('Đang xuất file Excel...');
      const response = await import('../../services/apiClient').then((m) =>
        m.default.get('/api/reports/export/strategic-excel', { responseType: 'blob' })
      );

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chien_luoc_${new Date().getTime()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Đã xuất báo cáo Excel', { id: toastId });
    } catch (error) {
      toast.error('Lỗi xuất báo cáo Excel');
    }
  };

  const filteredInvestments = investments.filter(inv => 
    (inv.source || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPublications = publications.filter(pub => 
    (pub.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pub.authors || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roiData = rooms.map(room => {
    const roomInvs = investments.filter(inv => inv.room_id === room.id);
    const roomPubs = publications.filter(pub => pub.room_id === room.id);
    
    const totalInv = roomInvs.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const totalPubs = roomPubs.length;
    const q1q2Pubs = roomPubs.filter(p => p.category === 'Q1' || p.category === 'Q2').length;
    
    return {
      id: room.id,
      name: room.name,
      totalInv,
      totalPubs,
      q1q2Pubs,
    };
  }).filter(r => r.totalInv > 0 || r.totalPubs > 0).sort((a,b) => b.totalPubs - a.totalPubs);

  const invByYear = investments.reduce((acc, inv) => {
    const y = inv.year;
    acc[y] = (acc[y] || 0) + Number(inv.amount);
    return acc;
  }, {} as Record<string, number>);
  const chartDataInv = Object.keys(invByYear).map(y => ({ year: y, amount: invByYear[y] })).sort((a,b) => Number(a.year) - Number(b.year));

  const pubsByCat = publications.reduce((acc, pub) => {
    const c = pub.category || 'Khác';
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const COLORS = ['#1E5FA5', '#F59E0B', '#10B981', '#6366F1', '#8B5CF6'];
  const chartDataPub = Object.keys(pubsByCat).map((c, i) => ({ name: c, value: pubsByCat[c], color: COLORS[i % COLORS.length] }));

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-300 h-full flex flex-col">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-[24px] font-bold text-[#212121] dark:text-slate-100 mb-4">
            {t('strategic_management')}
          </h1>
          <div className="flex border-b border-[#E0E0E0] dark:border-slate-800">
            <button
              onClick={() => setActiveTab('investment')}
              className={`px-5 py-2 text-[14px] font-medium border-b-2 transition-colors ${activeTab === 'investment' ? 'border-[#1E5FA5] text-[#1E5FA5] dark:text-blue-400' : 'border-transparent text-[#757575] dark:text-slate-400'}`}
            >
              {t('tab_investment')}
            </button>
            <button
              onClick={() => setActiveTab('publication')}
              className={`px-5 py-2 text-[14px] font-medium border-b-2 transition-colors ${activeTab === 'publication' ? 'border-[#1E5FA5] text-[#1E5FA5] dark:text-blue-400' : 'border-transparent text-[#757575] dark:text-slate-400'}`}
            >
              {t('tab_publications')}
            </button>
            <button
              onClick={() => setActiveTab('roi')}
              className={`px-5 py-2 text-[14px] font-medium border-b-2 transition-colors ${activeTab === 'roi' ? 'border-[#1E5FA5] text-[#1E5FA5] dark:text-blue-400' : 'border-transparent text-[#757575] dark:text-slate-400'}`}
            >
              {t('tab_roi_charts')}
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {activeTab !== 'roi' && (
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-[#E0E0E0] dark:border-slate-700 text-[#212121] dark:text-slate-200 px-4 py-2 rounded-xl font-bold transition-all shadow-sm text-[14px] hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Download className="w-4 h-4" /> {t('export_excel')}
            </button>
          )}
          {/* Chỉ hiện nút Thêm Đầu tư cho Admin. Nút {t('add_publication')} hiện cho cả Admin & Instructor */}
          {((isAdmin && activeTab === 'investment') || activeTab === 'publication') && (
            <button
              onClick={() => handleOpenAdd(activeTab)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg text-[14px]"
            >
              <Plus className="w-4 h-4" /> {activeTab === 'investment' ? 'Thêm Đầu tư' : t('add_publication')}
            </button>
          )}
        </div>
      </div>

      {/* Thẻ KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-shrink-0">
        <KPICard
          title="{t('total_investment')}"
          value={
            (() => {
              const total = investments.reduce((sum, inv) => sum + Number(inv.amount), 0);
              if (total >= 1000000000) {
                return `${(total / 1000000000).toFixed(2).replace(/\.00$/, '').replace('.', ',')} Tỷ ₫`;
              }
              if (total >= 1000000) {
                return `${(total / 1000000).toFixed(2).replace(/\.00$/, '').replace('.', ',')} Tr ₫`;
              }
              return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total);
            })()
          }
          sub="{t('all_time')}"
          icon={<DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          bg="bg-emerald-100 dark:bg-emerald-900/30"
        />
        <KPICard
          title="{t('investment_projects')}"
          value={investments.length}
          sub="{t('projects_categories')}"
          icon={<Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          bg="bg-blue-100 dark:bg-blue-900/30"
        />
        <KPICard
          title="{t('total_publications')}"
          value={publications.length}
          sub="{t('all_types')}"
          icon={<FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
          bg="bg-indigo-100 dark:bg-indigo-900/30"
        />
        <KPICard
          title="{t('high_quality_pubs')}"
          value={publications.filter(p => p.category === 'Q1' || p.category === 'Q2').length}
          sub="{t('high_quality_desc')}"
          icon={<Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
          bg="bg-amber-100 dark:bg-amber-900/30"
        />
      </div>
      {activeTab !== 'roi' && (
        <div className="flex items-center bg-slate-50/50 dark:bg-slate-800/30 p-4 border border-[#E0E0E0] dark:border-slate-800 rounded-xl mb-[-8px]">
          <div className="relative w-full max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#757575] dark:text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'investment' ? 'Tìm theo mô tả, nguồn vốn...' : t('search_publication_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-[#E0E0E0] dark:border-slate-700 rounded-lg text-[14px] focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-[#E0E0E0] dark:border-slate-800 flex-1 overflow-auto p-4 min-h-0 scrollbar-thin scrollbar-thumb-[#E0E0E0] dark:scrollbar-thumb-slate-700">
        {isLoading ? (
          <LoadingSpinner text="Đang tải dữ liệu..." />
        ) : activeTab === 'investment' ? (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="border-b bg-slate-50 dark:bg-slate-800">
                <th className="p-3 text-[13px] text-gray-500">{t('pub_lab_room')}</th>
                <th className="p-3 text-[13px] text-gray-500">Hạng mục & Nguồn vốn</th>
                <th className="p-3 text-[13px] text-gray-500 text-right">Số tiền (VNĐ)</th>
                <th className="p-3 text-[13px] text-gray-500 text-center">Năm</th>
                <th className="p-3 text-[13px] text-gray-500 w-24">{t('pub_action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0] dark:divide-slate-800">
              {filteredInvestments.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  <td className="p-3 font-medium text-sm">{inv.room?.name || 'N/A'}</td>
                  <td className="p-3">
                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{inv.description || 'Đầu tư chung'}</div>
                    {inv.source && <div className="text-xs text-slate-500 mt-1">Nguồn: {inv.source}</div>}
                  </td>
                  <td className="p-3 text-emerald-600 font-bold text-right">
                    {Number(inv.amount).toLocaleString()}
                  </td>
                  <td className="p-3 text-gray-500 text-center">
                    {inv.year}
                  </td>
                  <td className="p-3">
                    {isAdmin && (
                      <button
                        onClick={() =>
                          setDeleteConfirm({ isOpen: true, type: 'investment', id: inv.id })
                        }
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Xóa đầu tư"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : activeTab === 'publication' ? (
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="border-b bg-slate-50 dark:bg-slate-800">
                <th className="p-3 text-[13px] text-gray-500">{t('pub_title')}</th>
                <th className="p-3 text-[13px] text-gray-500">{t('pub_authors')}</th>
                <th className="p-3 text-[13px] text-gray-500">{t('pub_journal_year')}</th>
                <th className="p-3 text-[13px] text-gray-500">{t('pub_category')}</th>
                <th className="p-3 text-[13px] text-gray-500">{t('pub_lab_room')}</th>
                <th className="p-3 text-[13px] text-gray-500 w-24">{t('pub_action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0] dark:divide-slate-800">
              {filteredPublications.map((pub) => (
                <tr key={pub.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  <td className="p-3 max-w-xs">
                    <div className="font-semibold text-sm truncate" title={pub.title}>{pub.title}</div>
                    {pub.doi && (
                      <a href={`https://doi.org/${pub.doi}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-1 block">
                        DOI: {pub.doi}
                      </a>
                    )}
                  </td>
                  <td className="p-3 text-sm">{pub.authors}</td>
                  <td className="p-3 text-sm">
                    <i>{pub.journal}</i> ({pub.year})
                  </td>
                  <td className="p-3">
                    {pub.category && (
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full">
                        {pub.category}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-sm">{pub.room?.name || 'N/A'}</td>
                  <td className="p-3">
                    {isAdmin && (
                      <button
                        onClick={() =>
                          setDeleteConfirm({ isOpen: true, type: 'publication', id: pub.id })
                        }
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Xóa công bố"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : activeTab === 'roi' ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-[#E0E0E0] dark:border-slate-800 shadow-sm">
                <h3 className="text-[16px] font-bold text-[#212121] dark:text-slate-100 mb-6 text-center">Vốn Đầu Tư Qua Các Năm</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartDataInv}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                      <XAxis dataKey="year" axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(val) => `${val / 1000000}M`} axisLine={false} tickLine={false} width={80} />
                      <RechartsTooltip formatter={(val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)} cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Chart */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-[#E0E0E0] dark:border-slate-800 shadow-sm">
                <h3 className="text-[16px] font-bold text-[#212121] dark:text-slate-100 mb-6 text-center">Phân Loại Công Bố Khoa Học</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartDataPub}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {chartDataPub.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-[#E0E0E0] dark:border-slate-800 shadow-sm">
              <h3 className="text-[16px] font-bold text-[#212121] dark:text-slate-100 mb-4">Bảng Phân Tích Hiệu Suất (ROI) Theo Phòng Lab</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-slate-50 dark:bg-slate-800 text-[13px] font-semibold text-[#757575] dark:text-slate-400">
                      <th className="p-4">{t('pub_lab_room')}</th>
                      <th className="p-4 text-right">Tổng Vốn Đầu Tư</th>
                      <th className="p-4 text-center">Tổng Công Bố</th>
                      <th className="p-4 text-center">Bài Báo Q1/Q2</th>
                      <th className="p-4 text-right">Hiệu Suất Tương Đối</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roiData.map((row) => (
                      <tr key={row.id} className="border-b border-[#E0E0E0] dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors text-[14px]">
                        <td className="p-4 font-medium text-[#212121] dark:text-slate-200">{row.name}</td>
                        <td className="p-4 text-emerald-600 dark:text-emerald-400 font-bold text-right">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(row.totalInv)}
                        </td>
                        <td className="p-4 text-center font-bold text-[#1E5FA5] dark:text-blue-400">{row.totalPubs}</td>
                        <td className="p-4 text-center font-bold text-amber-600 dark:text-amber-500">{row.q1q2Pubs}</td>
                        <td className="p-4 text-right">
                          <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1.5 rounded-md text-[12px] font-semibold">
                            {row.totalInv > 0 ? `${((row.totalPubs / (row.totalInv / 1000000)) * 100).toFixed(2)} bài / 100tr` : '0 bài / 100tr'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {roiData.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-[#757575] dark:text-slate-400">Không có dữ liệu đánh giá ROI</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-[500px] p-6">
            <h2 className="text-xl font-bold mb-4">
              {formType === 'investment' ? `Thêm ${t('tab_investment')}` : `Thêm ${t('tab_publications')}`}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formType === 'investment' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('pub_lab_room')}</label>
                    <select
                      required
                      value={invForm.room_id}
                      onChange={(e) => setInvForm({ ...invForm, room_id: e.target.value })}
                      className="w-full border rounded-lg p-2 dark:bg-slate-800"
                    >
                      <option value="">-- Chọn phòng --</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Số tiền đầu tư (VNĐ)</label>
                      <input
                        type="number"
                        required
                        value={invForm.amount}
                        onChange={(e) =>
                          setInvForm({ ...invForm, amount: e.target.value })
                        }
                        className="w-full border rounded-lg p-2 dark:bg-slate-800"
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-sm font-medium mb-1">Năm đầu tư</label>
                      <input
                        type="number"
                        required
                        value={invForm.year}
                        onChange={(e) =>
                          setInvForm({ ...invForm, year: e.target.value })
                        }
                        className="w-full border rounded-lg p-2 dark:bg-slate-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nguồn vốn</label>
                    <input
                      type="text"
                      placeholder="VD: Ngân sách trường, Doanh nghiệp tài trợ..."
                      value={invForm.source}
                      onChange={(e) =>
                        setInvForm({ ...invForm, source: e.target.value })
                      }
                      className="w-full border rounded-lg p-2 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Hạng mục</label>
                    <textarea
                      placeholder="VD: Nâng cấp máy chủ AI, Mua máy quang phổ..."
                      value={invForm.description}
                      onChange={(e) =>
                        setInvForm({ ...invForm, description: e.target.value })
                      }
                      className="w-full border rounded-lg p-2 dark:bg-slate-800 h-20"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('pub_lab_room')}</label>
                    <select
                      required
                      value={pubForm.room_id}
                      onChange={(e) => setPubForm({ ...pubForm, room_id: e.target.value })}
                      className="w-full border rounded-lg p-2 dark:bg-slate-800"
                    >
                      <option value="">-- Chọn phòng --</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tiêu đề Công bố</label>
                    <input
                      type="text"
                      required
                      value={pubForm.title}
                      onChange={(e) => setPubForm({ ...pubForm, title: e.target.value })}
                      className="w-full border rounded-lg p-2 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('pub_authors')}</label>
                    <input
                      type="text"
                      required
                      value={pubForm.authors}
                      onChange={(e) => setPubForm({ ...pubForm, authors: e.target.value })}
                      className="w-full border rounded-lg p-2 dark:bg-slate-800"
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Tạp chí</label>
                      <input
                        type="text"
                        required
                        value={pubForm.journal}
                        onChange={(e) => setPubForm({ ...pubForm, journal: e.target.value })}
                        className="w-full border rounded-lg p-2 dark:bg-slate-800"
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-sm font-medium mb-1">Năm</label>
                      <input
                        type="number"
                        required
                        value={pubForm.year}
                        onChange={(e) =>
                          setPubForm({ ...pubForm, year: e.target.value })
                        }
                        className="w-full border rounded-lg p-2 dark:bg-slate-800"
                      />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">{t('pub_category')}</label>
                      <select
                        value={pubForm.category}
                        onChange={(e) => setPubForm({ ...pubForm, category: e.target.value })}
                        className="w-full border rounded-lg p-2 dark:bg-slate-800"
                      >
                        <option value="">-- Không phân loại --</option>
                        <option value="Q1">Chuẩn Q1</option>
                        <option value="Q2">Chuẩn Q2</option>
                        <option value="Q3/Q4">Chuẩn Q3/Q4</option>
                        <option value="ISI/Scopus">ISI/Scopus</option>
                        <option value="Trong nước">Tạp chí Trong nước</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">DOI (Optional)</label>
                      <input
                        type="text"
                        placeholder="VD: 10.1109/TMI.2023.123456"
                        value={pubForm.doi}
                        onChange={(e) => setPubForm({ ...pubForm, doi: e.target.value })}
                        className="w-full border rounded-lg p-2 dark:bg-slate-800"
                      />
                    </div>
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Hủy
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Xác nhận xóa"
        message="Bạn có chắc chắn muốn xóa mục này không?"
        confirmText="Xóa"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, type: 'investment', id: null })}
      />
    </div>
  );
}

function KPICard({
  title,
  value,
  sub,
  icon,
  bg,
}: {
  title: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl shadow-sm border border-[#E0E0E0]/50 dark:border-slate-800/50 p-5 flex items-start gap-4 transition-all hover:-translate-y-1 hover:shadow-md">
      <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <div className="text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
          {title}
        </div>
        <div className="text-[20px] lg:text-[24px] font-bold text-[#212121] dark:text-slate-100 leading-none mb-2 line-clamp-1">
          {value}
        </div>
        <div className="text-[12px] text-[#757575] dark:text-slate-400">{sub}</div>
      </div>
    </div>
  );
}
