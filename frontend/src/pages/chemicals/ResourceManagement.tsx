import { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { DeviceManagement } from "../equipment/DeviceManagement";
import { ChemicalManagement } from "./ChemicalManagement";
import { roomService } from "../../services";
import { ConfirmModal } from "../../components/common/ConfirmModal";
import { toast } from "react-hot-toast";

export function ResourceManagement() {
  const [activeTab, setActiveTab] = useState("Thiết bị");
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: "", location: "", capacity: 30, has_air_conditioner: true });
  const [editingRoom, setEditingRoom] = useState({ id: 0, name: "", location: "", capacity: 30, has_air_conditioner: true });
  const [deleteConfirmRoomId, setDeleteConfirmRoomId] = useState<number | null>(null);

  const fetchRooms = () => {
    setIsLoadingRooms(true);
    roomService.getAll()
      .then(res => setRooms(res.data || []))
      .catch(() => { /* apiClient.ts sẽ tự hiển thị toast lỗi */ })
      .finally(() => setIsLoadingRooms(false));
  };

  useEffect(() => {
    if (activeTab === "Phòng Lab") {
      fetchRooms();
    }
  }, [activeTab]);

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await roomService.create(newRoom);
      setIsAddingRoom(false);
      setNewRoom({ name: "", location: "", capacity: 30, has_air_conditioner: true });
      toast.success("Thêm phòng Lab thành công!");
      fetchRooms();
    } catch {
      toast.error("Thêm phòng thất bại");
    }
  };

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await roomService.update(editingRoom.id.toString(), {
        name: editingRoom.name, location: editingRoom.location, capacity: editingRoom.capacity, has_air_conditioner: editingRoom.has_air_conditioner
      });
      setIsEditingRoom(false);
      toast.success("Cập nhật phòng Lab thành công!");
      fetchRooms();
    } catch {
      toast.error("Cập nhật phòng thất bại");
    }
  };

  const executeDeleteRoom = async () => {
    if (deleteConfirmRoomId) {
      try {
        await roomService.delete(deleteConfirmRoomId.toString());
        toast.success("Xóa phòng Lab thành công!");
        setDeleteConfirmRoomId(null);
        fetchRooms();
      } catch {
        toast.error("Xóa phòng thất bại");
      }
    }
  };

  return (
    <div className="h-full flex overflow-hidden max-w-[1400px] mx-auto animate-in fade-in duration-300 gap-6">
      <div className="flex-1 flex flex-col space-y-6 min-w-0">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-[24px] font-bold text-[#212121] mb-4">Quản lý Tài nguyên</h1>
            {/* Tabs */}
            <div className="flex border-b border-[#E0E0E0]">
              {['Phòng Lab', 'Thiết bị', 'Hóa chất'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2 text-[14px] font-medium border-b-2 transition-colors ${
                    activeTab === tab 
                      ? 'border-[#1E5FA5] text-[#1E5FA5]' 
                      : 'border-transparent text-[#757575] hover:text-[#212121]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeTab === "Thiết bị" && (
          <div className="flex-1 overflow-auto -mx-6 px-6">
            <DeviceManagement />
          </div>
        )}

        {activeTab === "Phòng Lab" && (
          <div className="bg-white rounded-xl shadow-sm border border-[#E0E0E0] flex-1 flex flex-col overflow-hidden">
             <div className="p-4 border-b border-[#E0E0E0] bg-[#F5F5F5] flex justify-between">
               <div className="relative w-[300px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#757575]" />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm phòng..." 
                  className="w-full pl-9 pr-4 py-2 bg-white border border-[#E0E0E0] rounded text-[14px] focus:outline-none focus:border-[#1E5FA5]"
                />
              </div>
              <button onClick={() => setIsAddingRoom(true)} className="flex items-center gap-2 bg-[#1E5FA5] hover:bg-[#154a85] text-white px-4 py-2 rounded-md font-medium transition-colors text-[14px]">
                <Plus className="w-4 h-4" /> Thêm Phòng
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E0E0E0] bg-white sticky top-0">
                    <th className="px-6 py-4 text-[13px] font-semibold text-[#757575]">ID</th>
                    <th className="px-6 py-4 text-[13px] font-semibold text-[#757575]">Tên Phòng Lab</th>
                    <th className="px-6 py-4 text-[13px] font-semibold text-[#757575]">Vị trí</th>
                    <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] text-center">Sức chứa</th>
                    <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] text-center">Điều hòa</th>
                    <th className="px-6 py-4 text-[13px] font-semibold text-[#757575] text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E0E0E0]">
                  {isLoadingRooms ? (
                    <tr><td colSpan={5} className="p-8 text-center text-[#757575]">Đang tải...</td></tr>
                  ) : rooms.map((r) => (
                    <tr key={r.id} className="hover:bg-[#F5F5F5] bg-white transition-colors">
                      <td className="px-6 py-4 text-[14px] font-mono text-[#757575]">{r.id}</td>
                      <td className="px-6 py-4 text-[14px] font-bold text-[#212121]">{r.name}</td>
                      <td className="px-6 py-4 text-[14px] text-[#212121]">{r.location}</td>
                      <td className="px-6 py-4 text-[14px] text-center text-[#212121]">{r.capacity} người</td>
                      <td className="px-6 py-4 text-center">
                        {r.has_air_conditioner ? (
                          <span className="px-2 py-1 bg-[#E8F5E9] text-[#2E7D32] rounded text-[12px]">Có</span>
                        ) : (
                          <span className="px-2 py-1 bg-[#F5F5F5] text-[#757575] rounded text-[12px]">Không</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => {
                            setEditingRoom({ id: r.id, name: r.name, location: r.location, capacity: r.capacity, has_air_conditioner: r.has_air_conditioner });
                            setIsEditingRoom(true);
                          }} className="p-1.5 text-[#757575] hover:text-[#1E5FA5] hover:bg-[#D6E4F7] rounded transition-colors" title="Sửa">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteConfirmRoomId(r.id)} className="p-1.5 text-[#757575] hover:text-[#C62828] hover:bg-[#FDEDED] rounded transition-colors" title="Xóa">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!isLoadingRooms && rooms.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-[#757575]">Chưa có phòng Lab nào</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "Hóa chất" && (
          <div className="flex-1 overflow-auto -mx-6 px-6">
            <ChemicalManagement />
          </div>
        )}

      </div>

      {isAddingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-[20px] font-bold text-[#212121] mb-4">Thêm phòng Lab mới</h2>
            <form onSubmit={handleAddRoom} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Tên phòng Lab</label>
                <input required type="text" value={newRoom.name} onChange={e => setNewRoom({...newRoom, name: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md focus:outline-none focus:border-[#1E5FA5]" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Vị trí (Tòa/Tầng)</label>
                <input required type="text" value={newRoom.location} onChange={e => setNewRoom({...newRoom, location: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md focus:outline-none focus:border-[#1E5FA5]" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Sức chứa (người)</label>
                <input required type="number" min="1" value={newRoom.capacity} onChange={e => setNewRoom({...newRoom, capacity: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md focus:outline-none focus:border-[#1E5FA5]" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="has_air" checked={newRoom.has_air_conditioner} onChange={e => setNewRoom({...newRoom, has_air_conditioner: e.target.checked})} className="rounded border-[#E0E0E0]" />
                <label htmlFor="has_air" className="text-[14px] text-[#212121]">Có điều hòa</label>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsAddingRoom(false)} className="px-4 py-2 text-[#757575] hover:bg-[#F5F5F5] rounded-md transition-colors">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-[#1E5FA5] hover:bg-[#154a85] text-white rounded-md transition-colors">Thêm phòng</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-[20px] font-bold text-[#212121] mb-4">Sửa thông tin phòng Lab</h2>
            <form onSubmit={handleUpdateRoom} className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Tên phòng Lab</label>
                <input required type="text" value={editingRoom.name} onChange={e => setEditingRoom({...editingRoom, name: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md focus:outline-none focus:border-[#1E5FA5]" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Vị trí (Tòa/Tầng)</label>
                <input required type="text" value={editingRoom.location} onChange={e => setEditingRoom({...editingRoom, location: e.target.value})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md focus:outline-none focus:border-[#1E5FA5]" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#757575] mb-1">Sức chứa (người)</label>
                <input required type="number" min="1" value={editingRoom.capacity} onChange={e => setEditingRoom({...editingRoom, capacity: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-[#E0E0E0] rounded-md focus:outline-none focus:border-[#1E5FA5]" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="edit_has_air" checked={editingRoom.has_air_conditioner} onChange={e => setEditingRoom({...editingRoom, has_air_conditioner: e.target.checked})} className="rounded border-[#E0E0E0]" />
                <label htmlFor="edit_has_air" className="text-[14px] text-[#212121]">Có điều hòa</label>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsEditingRoom(false)} className="px-4 py-2 text-[#757575] hover:bg-[#F5F5F5] rounded-md transition-colors">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-[#1E5FA5] hover:bg-[#154a85] text-white rounded-md transition-colors">Cập nhật</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirmRoomId !== null}
        title="Xóa phòng Lab"
        message="Bạn có chắc chắn muốn xóa phòng Lab này không? Hành động này sẽ xóa các thiết bị và lịch đặt thuộc về phòng này. Không thể hoàn tác!"
        confirmText="Xóa phòng"
        isDestructive={true}
        onConfirm={executeDeleteRoom}
        onCancel={() => setDeleteConfirmRoomId(null)}
      />
    </div>
  );
}
