import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Edit2, Trash2, Home, CheckCircle2, Wind, Upload } from 'lucide-react';
import { DeviceManagement } from '../equipment/DeviceManagement';
import { ChemicalManagement } from './ChemicalManagement';
import { roomService, uploadService } from '../../services';
import { CombosManagement } from '../equipment/CombosManagement';
import { MaintenanceManagement } from '../equipment/MaintenanceManagement';
import { useRooms } from '../../hooks/useRooms';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { StatMini } from '../../components/ui/StatMini';
import { toast } from 'react-hot-toast';

export function ResourceManagement() {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState('Thiết bị');
  const tabs = [
    { id: 'Phòng Lab', label: t('lab_room') },
    { id: 'Thiết bị', label: t('equipment') },
    { id: 'Hóa chất', label: t('chemicals') },
    { id: 'Combo thiết bị', label: 'Combo thiết bị' },
    { id: 'Lịch bảo trì', label: 'Lịch bảo trì' },
  ];
  const { rooms, isLoadingRooms, fetchRooms } = useRooms();
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    location: '',
    capacity: 30,
    has_air_conditioner: true,
    image_url: '',
  });
  const [editingRoom, setEditingRoom] = useState({
    id: 0,
    name: '',
    location: '',
    capacity: 30,
    has_air_conditioner: true,
    image_url: '',
  });
  const [deleteConfirmRoomId, setDeleteConfirmRoomId] = useState<number | null>(null);
  const [searchRoomTerm, setSearchRoomTerm] = useState('');

  const filteredRooms = useMemo(() => {
    return rooms.filter(
      (r) =>
        r.name.toLowerCase().includes(searchRoomTerm.toLowerCase()) ||
        r.location.toLowerCase().includes(searchRoomTerm.toLowerCase())
    );
  }, [rooms, searchRoomTerm]);

  useEffect(() => {
    if (activeTab === 'Phòng Lab') {
      fetchRooms();
    }
  }, [activeTab]);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, isEditing: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const toastId = toast.loading('Đang tải ảnh lên...');
      const res = await uploadService.uploadFile(file);
      const imageUrl = res.data.url;
      if (isEditing) {
        setEditingRoom((prev) => ({ ...prev, image_url: imageUrl }));
      } else {
        setNewRoom((prev) => ({ ...prev, image_url: imageUrl }));
      }
      toast.success(t('upload_image_success'), { id: toastId });
    } catch (error) {
      toast.error('Lỗi tải ảnh lên');
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await roomService.create(newRoom);
      setIsAddingRoom(false);
      setNewRoom({
        name: '',
        location: '',
        capacity: 30,
        has_air_conditioner: true,
        image_url: '',
      });
      toast.success(t('add_room_success'));
      fetchRooms();
    } catch (error: unknown) {
      const err = error as any;
      const msg = err.response?.data?.message || t('add_room_failed');
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await roomService.update(editingRoom.id.toString(), {
        name: editingRoom.name,
        location: editingRoom.location,
        capacity: editingRoom.capacity,
        has_air_conditioner: editingRoom.has_air_conditioner,
        image_url: editingRoom.image_url,
      });
      setIsEditingRoom(false);
      toast.success(t('update_room_success'));
      fetchRooms();
    } catch (error: unknown) {
      const err = error as any;
      const msg = err.response?.data?.message || t('update_room_failed');
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  const executeDeleteRoom = async () => {
    if (deleteConfirmRoomId) {
      try {
        await roomService.delete(deleteConfirmRoomId.toString());
        toast.success(t('delete_room_success'));
        setDeleteConfirmRoomId(null);
        fetchRooms();
      } catch (error: unknown) {
        const err = error as any;
        const msg = err.response?.data?.message || t('delete_room_failed');
        toast.error(Array.isArray(msg) ? msg[0] : msg);
      }
    }
  };

  return (
    <div className="h-full flex overflow-hidden max-w-[1400px] mx-auto animate-in fade-in duration-300 gap-6">
      <div className="flex-1 flex flex-col space-y-6 min-w-0">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-[24px] font-bold text-[#212121] dark:text-slate-100 mb-4">
              {t('manage_resources')}
            </h1>
            {/* Tabs */}
            <div className="flex border-b border-[#E0E0E0] dark:border-slate-800">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-2 text-[14px] font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#1E5FA5] text-[#1E5FA5] dark:text-blue-400'
                      : 'border-transparent text-[#757575] dark:text-slate-400 hover:text-[#212121] dark:text-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeTab === 'Thiết bị' && (
          <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6">
            <DeviceManagement />
          </div>
        )}

        {activeTab === 'Phòng Lab' && (
          <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6">
            <div className="flex flex-col space-y-4 h-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                  <h2 className="text-[20px] font-bold text-[#0F172A] dark:text-slate-100 flex items-center gap-2">
                    <Home className="w-6 h-6 text-indigo-500" />
                    Quản lý Phòng Lab
                  </h2>
                  <p className="text-[13px] text-[#64748B] dark:text-slate-400 mt-1">
                    Quản lý danh sách các phòng thực hành và sức chứa.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingRoom(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl text-[14px] font-bold flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
                >
                  <Plus className="w-4 h-4" /> Thêm Phòng
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-2">
              <StatMini
                label={t('total_rooms', 'Tổng số phòng')}
                value={rooms.length}
                icon={<Home className="w-5 h-5" />}
                color="text-indigo-600"
                bgColor="bg-indigo-600"
              />
              <StatMini
                label={t('available_rooms', 'Đang khả dụng')}
                value={rooms.length}
                icon={<CheckCircle2 className="w-5 h-5" />}
                color="text-green-600"
                bgColor="bg-green-600"
              />
              <StatMini
                label={t('with_ac', 'Có điều hòa')}
                value={rooms.filter((r) => r.has_air_conditioner).length}
                icon={<Wind className="w-5 h-5" />}
                color="text-blue-500"
                bgColor="bg-blue-500"
              />
            </div>
            <div className="bg-white/50 dark:bg-slate-800/20 backdrop-blur-sm rounded-2xl shadow-sm border border-[#E0E0E0]/50 dark:border-slate-800/50 flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-[#E0E0E0]/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-md flex justify-between">
                <div className="relative w-[300px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#757575] dark:text-slate-400" />
                  <input
                    type="text"
                    value={searchRoomTerm}
                    onChange={(e) => setSearchRoomTerm(e.target.value)}
                    placeholder={t('search_room_placeholder')}
                    className="w-full pl-9 pr-4 py-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-[#E0E0E0] dark:border-slate-800 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E0E0E0]/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm sticky top-0">
                      <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] dark:text-slate-400">
                        ID
                      </th>
                      <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] dark:text-slate-400">
                        {t('lab_room_name')}
                      </th>
                      <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] dark:text-slate-400">
                        {t('location')}
                      </th>
                      <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] dark:text-slate-400 text-center">
                        {t('capacity')}
                      </th>
                      <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] dark:text-slate-400 text-center">
                        {t('air_conditioner')}
                      </th>
                      <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] dark:text-slate-400 text-right">
                        {t('action')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0E0E0] dark:divide-slate-800">
                    {isLoadingRooms ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-8 text-center text-[#757575] dark:text-slate-400"
                        >
                          {t('loading')}
                        </td>
                      </tr>
                    ) : (
                      filteredRooms.map((r) => (
                        <tr
                          key={r.id}
                          className="hover:bg-[#F5F5F5] dark:hover:bg-slate-800 dark:bg-slate-800/50 bg-white dark:bg-slate-900 transition-colors"
                        >
                          <td className="px-6 py-4 text-[14px] font-mono text-[#757575] dark:text-slate-400">
                            {r.id}
                          </td>
                          <td className="px-6 py-4 text-[14px] font-bold text-[#212121] dark:text-slate-100">
                            {r.name}
                          </td>
                          <td className="px-6 py-4 text-[14px] text-[#212121] dark:text-slate-100">
                            {r.location}
                          </td>
                          <td className="px-6 py-4 text-[14px] text-center text-[#212121] dark:text-slate-100">
                            {r.capacity} {t('people')}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {r.has_air_conditioner ? (
                              <span className="px-2 py-1 bg-[#E8F5E9] dark:bg-green-900/30 text-[#2E7D32] rounded text-[12px]">
                                {t('yes')}
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-[#F5F5F5] dark:bg-slate-800/50 text-[#757575] dark:text-slate-400 rounded text-[12px]">
                                {t('no')}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingRoom({
                                    id: r.id,
                                    name: r.name,
                                    location: r.location,
                                    capacity: r.capacity,
                                    has_air_conditioner: r.has_air_conditioner,
                                    image_url: r.image_url || '',
                                  });
                                  setIsEditingRoom(true);
                                }}
                                className="p-1.5 text-[#757575] dark:text-slate-400 hover:text-[#1E5FA5] dark:text-blue-400 hover:bg-[#D6E4F7] dark:bg-blue-900/30 rounded transition-colors"
                                title={t('edit')}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmRoomId(r.id)}
                                className="p-1.5 text-[#757575] dark:text-slate-400 hover:text-[#C62828] hover:bg-[#FDEDED] dark:bg-red-900/30 rounded transition-colors"
                                title={t('delete')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                    {!isLoadingRooms && filteredRooms.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-8 text-center text-[#757575] dark:text-slate-400"
                        >
                          {t('no_lab_rooms')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'Hóa chất' && (
          <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6">
            <ChemicalManagement />
          </div>
        )}

        {activeTab === 'Combo thiết bị' && (
          <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6">
            <CombosManagement />
          </div>
        )}

        {activeTab === 'Lịch bảo trì' && (
          <div className="flex-1 flex flex-col min-h-0 -mx-6 px-6">
            <MaintenanceManagement />
          </div>
        )}
      </div>

      {isAddingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-[20px] font-bold text-[#212121] dark:text-slate-100 mb-4">
              {t('add_new_lab_room')}
            </h2>
            <form onSubmit={handleAddRoom} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                  {t('lab_room_name_label')}
                </label>
                <input
                  required
                  type="text"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-[#E0E0E0] dark:border-slate-800 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                  {t('location_label')}
                </label>
                <input
                  required
                  type="text"
                  value={newRoom.location}
                  onChange={(e) => setNewRoom({ ...newRoom, location: e.target.value })}
                  className="w-full px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-[#E0E0E0] dark:border-slate-800 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                  {t('capacity_label')}
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={newRoom.capacity}
                  onChange={(e) => setNewRoom({ ...newRoom, capacity: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-[#E0E0E0] dark:border-slate-800 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="has_air"
                  checked={newRoom.has_air_conditioner}
                  onChange={(e) =>
                    setNewRoom({ ...newRoom, has_air_conditioner: e.target.checked })
                  }
                  className="rounded border-[#E0E0E0] dark:border-slate-800"
                />
                <label htmlFor="has_air" className="text-[14px] text-[#212121] dark:text-slate-100">
                  {t('has_air_conditioner')}
                </label>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                  Ảnh (Tùy chọn)
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2 bg-white/80 dark:bg-slate-900/80 border border-[#E0E0E0] dark:border-slate-800 rounded-lg hover:bg-[#F5F5F5] dark:hover:bg-slate-800 transition-colors text-[13px] font-medium text-[#757575] dark:text-slate-300 w-fit">
                    <Upload className="w-4 h-4" /> Chọn ảnh
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUploadImage(e, false)}
                    />
                  </label>
                  {newRoom.image_url && (
                    <img
                      src={`http://localhost:3000${newRoom.image_url}`}
                      alt="Preview"
                      className="h-10 w-10 object-cover rounded"
                    />
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#E0E0E0]/50 dark:border-slate-800/50">
                <button
                  type="button"
                  onClick={() => setIsAddingRoom(false)}
                  className="px-4 py-2 text-[14px] font-medium text-[#757575] dark:text-slate-400 hover:bg-[#F5F5F5] dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-[14px] font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5"
                >
                  {t('add_room_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-[20px] font-bold text-[#212121] dark:text-slate-100 mb-4">
              {t('edit_lab_room_info')}
            </h2>
            <form onSubmit={handleUpdateRoom} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                  {t('lab_room_name_label')}
                </label>
                <input
                  required
                  type="text"
                  value={editingRoom.name}
                  onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-[#E0E0E0] dark:border-slate-800 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                  {t('location_label')}
                </label>
                <input
                  required
                  type="text"
                  value={editingRoom.location}
                  onChange={(e) => setEditingRoom({ ...editingRoom, location: e.target.value })}
                  className="w-full px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-[#E0E0E0] dark:border-slate-800 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                  {t('capacity_label')}
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={editingRoom.capacity}
                  onChange={(e) =>
                    setEditingRoom({ ...editingRoom, capacity: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-white/80 dark:bg-slate-900/80 border border-[#E0E0E0] dark:border-slate-800 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_has_air"
                  checked={editingRoom.has_air_conditioner}
                  onChange={(e) =>
                    setEditingRoom({ ...editingRoom, has_air_conditioner: e.target.checked })
                  }
                  className="rounded border-[#E0E0E0] dark:border-slate-800"
                />
                <label
                  htmlFor="edit_has_air"
                  className="text-[14px] text-[#212121] dark:text-slate-100"
                >
                  {t('has_air_conditioner')}
                </label>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                  Ảnh (Tùy chọn)
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2 bg-white/80 dark:bg-slate-900/80 border border-[#E0E0E0] dark:border-slate-800 rounded-lg hover:bg-[#F5F5F5] dark:hover:bg-slate-800 transition-colors text-[13px] font-medium text-[#757575] dark:text-slate-300 w-fit">
                    <Upload className="w-4 h-4" /> Chọn ảnh
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUploadImage(e, true)}
                    />
                  </label>
                  {editingRoom.image_url && (
                    <img
                      src={`http://localhost:3000${editingRoom.image_url}`}
                      alt="Preview"
                      className="h-10 w-10 object-cover rounded"
                    />
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#E0E0E0]/50 dark:border-slate-800/50">
                <button
                  type="button"
                  onClick={() => setIsEditingRoom(false)}
                  className="px-4 py-2 text-[14px] font-medium text-[#757575] dark:text-slate-400 hover:bg-[#F5F5F5] dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-[14px] font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all duration-300 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5"
                >
                  {t('update')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirmRoomId !== null}
        title={t('delete_lab_room')}
        message={t('delete_lab_room_confirm')}
        confirmText={t('delete_room_btn')}
        isDestructive={true}
        onConfirm={executeDeleteRoom}
        onCancel={() => setDeleteConfirmRoomId(null)}
      />
    </div>
  );
}
