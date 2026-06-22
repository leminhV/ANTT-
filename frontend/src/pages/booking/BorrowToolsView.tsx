import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, FlaskConical, Wrench, AlertCircle, Info, Calendar as CalendarIcon, CheckCircle, Clock, ShoppingCart, X, Plus, Minus, Trash2, ChevronRight, Bell, Award } from 'lucide-react';
import apiClient from '../../services/apiClient';
import { equipmentService, chemicalService, roomService, bookingService, courseService, comboService } from '../../services';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Room {
  id: number;
  name: string;
}

interface Equipment {
  id: number;
  name: string;
  serial_number: string;
  status: string;
  room_id: number;
  image_url?: string;
  type: 'equipment';
  required_badge?: { name: string; icon_url: string };
}

interface Chemical {
  id: number;
  name: string;
  quantity_in_stock: number;
  unit: string;
  type: 'chemical';
}

interface Combo {
  id: number;
  name: string;
  description: string;
  image_url?: string;
  type: 'combo';
  items: any[];
}

interface CartItem {
  item: Equipment | Chemical | Combo;
  quantity: number;
}

export default function BorrowToolsView() {
  const { t } = useTranslation();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  
  const [combos, setCombos] = useState<Combo[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'equipment' | 'chemical' | 'combo'>('all');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  
  const [isLoading, setIsLoading] = useState(true);

  // Cart & Modal State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutStep, setIsCheckoutStep] = useState(false);
  
  // Booking Form State
  const [formData, setFormData] = useState({
    purpose: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '08:00',
    duration: '2',
    courseId: '',
    isRecurring: false,
    recurrenceEndDate: format(new Date(), 'yyyy-MM-dd'),
  });
  const [isWaitlist, setIsWaitlist] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [eqRes, chemRes, roomRes, courseRes, comboRes] = await Promise.all([
        equipmentService.getAll(),
        chemicalService.getAll(),
        roomService.getAll(),
        courseService.getAll(),
        comboService.getAll()
      ]);
      
      const eqs = eqRes.data.map((e: any) => ({ ...e, type: 'equipment' }));
      const chems = chemRes.data.map((c: any) => ({ ...c, type: 'chemical' }));
      const cmbs = comboRes.data.map((cb: any) => ({ ...cb, type: 'combo' }));
      
      setEquipments(eqs);
      setChemicals(chems);
      setRooms(roomRes.data);
      setCourses(courseRes.data);
      setCombos(cmbs);
    } catch (error) {
      toast.error('Lỗi tải dữ liệu tài sản');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCartItem = (item: Equipment | Chemical | Combo) => {
    const existingIndex = cart.findIndex(c => c.item.id === item.id && c.item.type === item.type);
    if (existingIndex >= 0) {
      setCart(cart.filter((_, idx) => idx !== existingIndex));
    } else {
      setCart([...cart, { item, quantity: 1 }]);
    }
  };

  const updateCartQuantity = (item: Equipment | Chemical | Combo, newQty: number) => {
    setCart(cart.map(c => {
      if (c.item.id === item.id && c.item.type === item.type) {
        return { ...c, quantity: newQty };
      }
      return c;
    }));
  };

  const openCheckout = () => {
    if (cart.length === 0) return;
    setFormData({
      ...formData,
      purpose: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '08:00',
      duration: '2',
      courseId: courses.length > 0 ? courses[0].id.toString() : '',
    });
    setIsCheckoutStep(true);
  };

  const handleWaitlist = async (itemId: number, itemType: string) => {
    try {
      await apiClient.post('/api/waitlists', {
        item_id: itemId,
        item_type: itemType.toUpperCase(),
      });
      toast.success('Đăng ký nhận thông báo thành công!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi đăng ký nhận thông báo');
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const startDate = new Date(`${formData.date}T${formData.startTime}:00`);
      const endDate = new Date(startDate.getTime() + parseInt(formData.duration) * 60 * 60 * 1000);

      const promises = cart.map(cartItem => {
        const item = cartItem.item;
        if (item.type === 'combo') {
          const payloadCombo: any = {
            room_id: rooms[0]?.id || 1,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            purpose: formData.purpose,
            course_id: formData.courseId ? Number(formData.courseId) : undefined,
          };
          if (formData.isRecurring && formData.recurrenceEndDate) {
            payloadCombo.recurrenceEndDate = new Date(`${formData.recurrenceEndDate}T23:59:59`).toISOString();
          }
          return comboService.book(item.id, payloadCombo);
        } else {
          let payload: any = {
            purpose: formData.purpose,
            startTime: startDate,
            endTime: endDate,
            status: isWaitlist ? 'WAITLISTED' : undefined,
          };
          
          if (formData.isRecurring && formData.recurrenceEndDate) {
            payload.recurrenceEndDate = new Date(`${formData.recurrenceEndDate}T23:59:59`).toISOString();
          }

          if (item.type === 'equipment') {
            const eq = item as Equipment;
            payload.roomId = eq.room_id;
            payload.equipmentId = eq.id;
          } else {
            const chem = item as Chemical;
            payload.roomId = rooms[0]?.id || 1; 
            payload.chemical_usages = [{ chemical_id: chem.id, quantity: cartItem.quantity }];
            if (formData.courseId) {
              payload.courseId = Number(formData.courseId);
            }
          }
          return bookingService.create(payload);
        }
      });

      await Promise.all(promises);

      toast.success('Đã gửi yêu cầu mượn thành công!');
      setIsCartOpen(false);
      setIsCheckoutStep(false);
      setCart([]);
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Có lỗi khi tạo yêu cầu. Một số đơn có thể đã được tạo.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = [
    ...(selectedType === 'all' || selectedType === 'equipment' ? equipments : []),
    ...(selectedType === 'all' || selectedType === 'chemical' ? chemicals : []),
    ...(selectedType === 'all' || selectedType === 'combo' ? combos : [])
  ].filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    
    if (selectedRoom !== 'all' && item.type === 'equipment') {
      const eq = item as Equipment;
      if (eq.room_id.toString() !== selectedRoom) return false;
    }
    
    return matchesSearch;
  });

  return (
    <div className="h-full flex flex-col gap-6 max-w-[1400px] mx-auto animate-in fade-in duration-300 relative">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-[#E0E0E0] dark:border-slate-800 shrink-0">
        <div>
          <h1 className="text-[24px] font-bold text-[#212121] dark:text-slate-100 flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            {t('borrow_tools_title')}
          </h1>
          <p className="text-[14px] text-[#757575] dark:text-slate-400 mt-1">
            {t('borrow_tools_desc')}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-[280px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#757575]" />
            <input
              type="text"
              placeholder={t('search_equipment_chemical')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-[#F5F5F5] dark:bg-slate-800 border-none rounded-xl text-[14px] focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
          </div>
          
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-500/30 flex items-center gap-2 font-bold transition-all hover:-translate-y-0.5"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="hidden sm:inline">{t('cart')}</span>
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-[12px] flex items-center justify-center border-2 border-white dark:border-slate-900">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters (Segmented Control style) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide shrink-0 bg-white/50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-200 dark:border-slate-800 w-fit">
        {[
          { id: 'all', label: t('all_assets'), icon: null },
          { id: 'equipment', label: t('equipment_machinery'), icon: Wrench },
          { id: 'chemical', label: t('consumable_chemicals'), icon: FlaskConical },
          { id: 'combo', label: '{t('practice_combo')}', icon: Filter }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedType(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-[14px] font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              selectedType === tab.id 
                ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm shadow-slate-200 dark:shadow-none' 
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.icon && <tab.icon className="w-4 h-4" />} {tab.label}
          </button>
        ))}

        <div className="h-6 w-[1px] bg-slate-300 dark:bg-slate-700 mx-2"></div>

        <select
          value={selectedRoom}
          onChange={(e) => setSelectedRoom(e.target.value)}
          className="px-4 py-2 bg-transparent border-none text-[14px] font-bold text-slate-600 dark:text-slate-300 outline-none focus:ring-0 cursor-pointer transition-colors"
        >
          <option value="all">{t('all_lab_rooms')}</option>
          {rooms.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      {/* Grid Catalog */}
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/30 border border-[#E0E0E0] dark:border-slate-800 rounded-2xl p-6 min-h-0">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E0E0E0] dark:border-slate-800 overflow-hidden h-[340px] flex flex-col animate-pulse">
                <div className="h-[180px] bg-slate-200 dark:bg-slate-800/50"></div>
                <div className="p-5 flex-1 flex flex-col gap-3">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800/50 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-800/50 rounded w-1/2"></div>
                  <div className="mt-auto h-10 bg-slate-200 dark:bg-slate-800/50 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E0E0E0] dark:border-slate-800 p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-[#212121] dark:text-slate-200 mb-2">{t('no_assets_found')}</h3>
            <p className="text-slate-500 dark:text-slate-400">{t('no_assets_desc')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item, idx) => {
            const isEq = item.type === 'equipment';
            const isCombo = item.type === 'combo';
            const eq = item as Equipment;
            const chem = item as Chemical;
            const combo = item as Combo;
            
            let roomName = '';
            if (isEq) roomName = rooms.find(r => r.id === eq.room_id)?.name || '';
            else if (isCombo) roomName = 'Dùng cho mọi Lab';
            else roomName = 'Kho Hóa Chất Chung';

            const isInCart = cart.some(c => c.item.id === item.id && c.item.type === item.type);
            const isDisabled = isEq && (eq.status === 'MAINTENANCE' || eq.status === 'IN_USE' || eq.status === 'BORROWED');

            return (
              <div key={`${item.type}-${item.id}`} className={`bg-white dark:bg-slate-900 rounded-2xl border ${isInCart ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-[#E0E0E0] dark:border-slate-800'} overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1.5 transition-all duration-300 group flex flex-col relative`}>
                
                {/* Image Placeholder with Gradient */}
                <div className={`h-[180px] flex items-center justify-center relative overflow-hidden p-6 ${
                  isEq ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20' 
                  : isCombo ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20'
                  : 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20'
                }`}>
                  {isEq ? (
                    <Wrench className="w-20 h-20 text-blue-300 dark:text-blue-700/50 group-hover:scale-110 transition-transform duration-500" />
                  ) : isCombo ? (
                    <Filter className="w-20 h-20 text-amber-300 dark:text-amber-700/50 group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <FlaskConical className="w-20 h-20 text-emerald-300 dark:text-emerald-700/50 group-hover:scale-110 transition-transform duration-500" />
                  )}
                  
                  {/* Badges Glassmorphism */}
                  <div className="absolute top-3 left-3">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold backdrop-blur-md ${
                      isEq 
                        ? 'bg-blue-500/10 text-blue-700 border border-blue-500/20' 
                        : isCombo
                          ? 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                    }`}>
                      {isEq ? t('asset_equipment') : isCombo ? 'Combo' : t('asset_chemical')}
                    </span>
                  </div>
                  {isEq && eq.status === 'MAINTENANCE' && (
                    <div className="absolute top-3 right-3 bg-red-500/10 backdrop-blur-md border border-red-500/20 text-red-600 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-sm">
                      <AlertCircle className="w-3 h-3" /> {t('maintenance')}
                    </div>
                  )}
                  {isEq && (eq.status === 'IN_USE' || eq.status === 'BORROWED') && (
                    <div className="absolute top-3 right-3 bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 text-emerald-600 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-sm">
                      <CheckCircle className="w-3 h-3" /> {t('borrowed')}
                    </div>
                  )}
                </div>
                
                {/* Content */}
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-[#212121] dark:text-slate-100 text-[16px] line-clamp-2 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.name}
                  </h3>
                  
                  <div className="space-y-2 mt-auto">
                    {isEq && (
                      <>
                        <div className="flex items-center gap-2 text-[13px] text-[#757575] dark:text-slate-400">
                          <Info className="w-4 h-4" /> S/N: {eq.serial_number}
                        </div>
                        {eq.required_badge && (
                          <div className="flex items-center gap-2 text-[13px] text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-900/30 w-max px-2 py-1 rounded-md mt-1">
                            <Award className="w-4 h-4" /> Yêu cầu: {eq.required_badge.name}
                          </div>
                        )}
                      </>
                    )}
                    {isCombo && (
                      <div className="flex items-center gap-2 text-[13px] text-[#757575] dark:text-slate-400">
                        <CheckCircle className="w-4 h-4 text-amber-500" /> Trọn bộ {combo.items?.length || 0} món
                      </div>
                    )}
                    {(!isEq && !isCombo) && (
                      <div className="flex items-center gap-2 text-[13px] text-[#757575] dark:text-slate-400">
                        <CheckCircle className="w-4 h-4 text-emerald-500" /> {t('stock_quantity_colon')} <strong className="text-emerald-600 dark:text-emerald-400">{chem.quantity_in_stock} {chem.unit}</strong>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[13px] text-[#757575] dark:text-slate-400">
                      <div className="w-4 h-4 flex items-center justify-center">🏢</div>
                      <span className="truncate">{roomName}</span>
                    </div>
                  </div>

                  {isDisabled ? (
                    <button
                      onClick={() => handleWaitlist(item.id, item.type)}
                      className="mt-5 w-full py-2.5 rounded-xl text-[14px] font-bold transition-all flex items-center justify-center gap-2 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 active:scale-95"
                    >
                      <Bell className="w-4 h-4" /> {t('notify_when_available')}
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleCartItem(item)}
                      className={`mt-5 w-full py-2.5 rounded-xl text-[14px] font-bold transition-all flex items-center justify-center gap-2 ${
                        isInCart
                          ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/50'
                          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-600 dark:hover:text-white border border-indigo-200 dark:border-indigo-800/50'
                      } active:scale-95`}
                    >
                      {isInCart ? 'Xóa khỏi giỏ' : '{t('add_to_cart')}'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
            onClick={() => setIsCartOpen(false)}
          ></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-slate-200 dark:border-slate-800">
            
            {!isCheckoutStep ? (
              <>
                <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-indigo-600" />
                    {t('cart')} đồ ({cart.length})
                  </h2>
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {cart.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                      <p>{t('cart')} đang trống</p>
                    </div>
                  ) : (
                    cart.map((cartItem, idx) => (
                      <div key={idx} className="flex gap-4 items-start p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center shrink-0">
                          {cartItem.item.type === 'equipment' ? <Wrench className="w-6 h-6 text-indigo-500" /> : cartItem.item.type === 'combo' ? <Filter className="w-6 h-6 text-amber-500" /> : <FlaskConical className="w-6 h-6 text-emerald-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 dark:text-white text-[14px] line-clamp-1">{cartItem.item.name}</h4>
                          <p className="text-[12px] text-slate-500 mt-1">
                            {cartItem.item.type === 'equipment' ? `S/N: ${(cartItem.item as Equipment).serial_number}` : cartItem.item.type === 'combo' ? 'Combo KIT' : 'Hóa chất'}
                          </p>
                          
                          {cartItem.item.type === 'chemical' && (
                            <div className="flex items-center gap-3 mt-3">
                              <span className="text-[12px] text-slate-500 font-medium">Số lượng:</span>
                              <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                                <button onClick={() => updateCartQuantity(cartItem.item, Math.max(0.1, cartItem.quantity - 1))} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded shadow-sm text-slate-600"><Minus className="w-3 h-3"/></button>
                                <span className="text-[13px] font-bold w-10 text-center">{cartItem.quantity}</span>
                                <button onClick={() => updateCartQuantity(cartItem.item, Math.min((cartItem.item as Chemical).quantity_in_stock, cartItem.quantity + 1))} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded shadow-sm text-slate-600"><Plus className="w-3 h-3"/></button>
                              </div>
                              <span className="text-[12px] text-slate-500">{(cartItem.item as Chemical).unit}</span>
                            </div>
                          )}
                        </div>
                        <button onClick={() => toggleCartItem(cartItem.item)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-6 border-t border-neutral-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <button
                    onClick={openCheckout}
                    disabled={cart.length === 0}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/30 disabled:shadow-none active:scale-95"
                  >
                    Tiến hành Đặt mượn <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              // Checkout Form Step
              <>
                <div className="flex items-center gap-3 p-6 border-b border-neutral-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <button 
                    onClick={() => setIsCheckoutStep(false)}
                    className="p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Thông tin Đặt lịch
                  </h2>
                </div>

                <form onSubmit={handleCreateBooking} className="flex-1 overflow-y-auto p-6 space-y-5">
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl text-[13px] text-indigo-700 dark:text-indigo-300 font-medium">
                    Bạn đang mượn {cart.length} tài nguyên. Thông tin điền dưới đây sẽ áp dụng chung cho tất cả các món đồ trong giỏ hàng.
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                      {t('usage_purpose')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      placeholder={t('usage_purpose_ex')}
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      className="w-full px-3 py-2.5 border border-[#E0E0E0] dark:border-slate-800 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-900"
                      disabled={isSubmitting}
                    />
                  </div>

                  {cart.some(c => c.item.type === 'chemical') && (
                    <div>
                      <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                        Học phần / Đề tài (Bắt buộc cho hóa chất) <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.courseId}
                        onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                        className="w-full px-3 py-2.5 border border-[#E0E0E0] dark:border-slate-800 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-900"
                        disabled={isSubmitting}
                      >
                        <option value="" disabled>-- Chọn học phần --</option>
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                        {t('date_label')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-3 py-2.5 border border-[#E0E0E0] dark:border-slate-800 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-900"
                        disabled={isSubmitting}
                        min={format(new Date(), 'yyyy-MM-dd')}
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                        {t('start_time_label')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        required
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full px-3 py-2.5 border border-[#E0E0E0] dark:border-slate-800 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-900"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                      {t('duration_label')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      className="w-full px-3 py-2.5 border border-[#E0E0E0] dark:border-slate-800 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-slate-900"
                      disabled={isSubmitting}
                    >
                      {Array.from({length: 12}).map((_, i) => (
                        <option key={i+1} value={i+1}>{i+1} {t('hour_unit')}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2 flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={isWaitlist}
                        onChange={(e) => setIsWaitlist(e.target.checked)}
                        className="w-4 h-4 rounded border-[#E0E0E0] dark:border-slate-700 text-amber-500 focus:ring-amber-500/50"
                      />
                      <span className="text-[13px] font-medium text-[#212121] dark:text-slate-300 group-hover:text-amber-500 transition-colors">
                        {t('put_in_waitlist')}
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.isRecurring}
                        onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                        className="w-4 h-4 rounded border-[#E0E0E0] dark:border-slate-700 text-indigo-500 focus:ring-indigo-500/50"
                      />
                      <span className="text-[13px] font-medium text-[#212121] dark:text-slate-300 group-hover:text-indigo-500 transition-colors">
                        Lặp lại định kỳ (Hàng tuần)
                      </span>
                    </label>

                    {formData.isRecurring && (
                      <div className="ml-6 pl-4 border-l-2 border-indigo-100 dark:border-indigo-900/50">
                        <label className="block text-[12px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                          Lặp lại cho đến ngày <span className="text-red-500">*</span>
                        </label>
                        <input
                          required={formData.isRecurring}
                          type="date"
                          value={formData.recurrenceEndDate}
                          onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                          className="w-full px-3 py-2 border border-[#E0E0E0] dark:border-slate-800 rounded-md text-[13px] focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-900"
                          disabled={isSubmitting}
                          min={formData.date}
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all text-[14px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6 active:scale-95"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Hoàn tất Đặt mượn'
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
