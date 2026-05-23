import { useState, useEffect } from "react";
import { Plus, Search, QrCode, X, Image as ImageIcon } from "lucide-react";
import { DeviceManagement } from "../equipment/DeviceManagement";
import { roomService } from "../../services";

export function ResourceManagement() {
  const [activeTab, setActiveTab] = useState("Thiết bị");
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  useEffect(() => {
    if (activeTab === "Phòng Lab") {
      setIsLoadingRooms(true);
      roomService.getAll()
        .then(res => setRooms(res.data || []))
        .catch(console.error)
        .finally(() => setIsLoadingRooms(false));
    }
  }, [activeTab]);

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
              <button className="flex items-center gap-2 bg-[#1E5FA5] hover:bg-[#154a85] text-white px-4 py-2 rounded-md font-medium transition-colors text-[14px]">
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
          <div className="flex-1 flex items-center justify-center bg-white border border-[#E0E0E0] rounded-xl text-[#757575]">
            Tính năng quản lý hóa chất đang được cập nhật...
          </div>
        )}

      </div>
    </div>
  );
}
