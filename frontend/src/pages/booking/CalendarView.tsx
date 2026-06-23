import { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  Clock,
  Calendar,
  Filter,
  Plus,
  Info,
  X,
  Hourglass,
  AlertCircle,
} from 'lucide-react';
import { bookingService, roomService, equipmentService, courseService, chemicalService } from '../../services';
import { format, startOfWeek, addDays, getHours, getDay, isSameDay } from 'date-fns';
import { toast } from 'react-hot-toast';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { socketService } from '../../services/socket';
import { IBooking, IRoom, IEquipment, ICourse, IChemical } from '../../types/models';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00 to 22:00

const LOCALIZED_NAMES_MAP: Record<string, string> = {
  'Lab Mạng máy tính': 'room_lab_computer_network',
  'Lab Sinh học phân tử': 'room_lab_molecular_biology',
  'Lab Máy tính hiệu năng cao': 'room_lab_high_performance_computing',
  'Lab Hóa Phân Tích': 'room_lab_analytical_chemistry',
  'Lab Năng lượng tái tạo': 'room_lab_renewable_energy',
  'Lab IoT & Robotics': 'room_lab_iot_robotics',
  'Lab Trí tuệ nhân tạo (AI)': 'room_lab_ai',
  'Lab Cơ điện tử': 'room_lab_mechatronics',
  'Thiết kế Vi mạch': 'course_ic_design',
  'Thực hành Vi điều khiển': 'course_microcontroller_practice',
  'Thực hành Robot công nghiệp': 'course_industrial_robot_practice',
  'Thí nghiệm Hóa vô cơ': 'course_inorganic_chemistry_experiment',
  'Thực hành Lập trình Mạng': 'course_network_programming_practice',
};

const getLocalizedName = (name: string, t: any) => {
  return LOCALIZED_NAMES_MAP[name] ? t(LOCALIZED_NAMES_MAP[name]) : name;
};

interface GridBooking {
  type: string;
  title: string;
  startMinute: number;
  durationMinutes: number;
  roomName: string;
  isPast: boolean;
  bookingId: number;
  userId: number;
  status: string;
}

export function CalendarView() {
  const { t } = useTranslation();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<IBooking[]>([]);
  const [rooms, setRooms] = useState<IRoom[]>([]);
  const [equipments, setEquipments] = useState<IEquipment[]>([]);
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [chemicals, setChemicals] = useState<IChemical[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<number[]>([]);
  const [selectedEquipments, setSelectedEquipments] = useState<number[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<number[]>([]);
  const [selectedChemicals, setSelectedChemicals] = useState<number[]>([]);
  const [chemicalUsages, setChemicalUsages] = useState<{ chemical_id: number; quantity: number }[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.filter-dropdown')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const location = useLocation();
  const isResourceMode = location.pathname === '/borrow-tools';
  const activeTab = isResourceMode ? 'RESOURCE' : 'SPACE';
  const [isWaitlist, setIsWaitlist] = useState(false);
  const [suggestedSlots, setSuggestedSlots] = useState<{ start_time: string; end_time: string }[]>(
    []
  );
  const [hasConflictError, setHasConflictError] = useState(false);

  // Drag & Drop state
  const [draggedBooking, setDraggedBooking] = useState<{
    bookingId: number;
    durationMinutes: number;
    originalDayIdx: number;
    originalHour: number;
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ dayIdx: number; hour: number } | null>(null);
  const [formData, setFormData] = useState({
    purpose: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '08:00',
    duration: '2',
    room_id: '',
    equipment_id: '',
    course_id: '',
  });

  const currentUserStr = localStorage.getItem('user');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const isInstructorOrAdmin = currentUser?.role === 'INSTRUCTOR' || currentUser?.role === 'ADMIN';

  // Calculate day bookings for Quick Preview
  const dayBookingsForSelectedRoom = bookings.filter((b) => {
    if (b.status !== 'APPROVED' && b.status !== 'IN_USE' && b.status !== 'PENDING') return false;
    if (b.room_id.toString() !== formData.room_id) return false;
    const bStart = new Date(b.start_time);
    return format(bStart, 'yyyy-MM-dd') === formData.date;
  }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  // Check overlap for current selection (Room overlap)
  const formStartMs = new Date(`${formData.date}T${formData.startTime}:00`).getTime();
  const formEndMs = formStartMs + parseInt(formData.duration || '1') * 60 * 60 * 1000;
  
  const overlappingBookings = dayBookingsForSelectedRoom.filter((b) => {
    if (b.status === 'PENDING') return false; 
    const bStart = new Date(b.start_time).getTime();
    const bEnd = new Date(b.end_time).getTime();
    return formStartMs < bEnd && bStart < formEndMs;
  });
  
  const hasOverlapCurrentSelection = overlappingBookings.length > 0;

  // Check user overlap (Ngăn chặn đặt 2 phòng cùng lúc)
  const userBookingsForSelectedDate = bookings.filter((b) => {
    if (b.status !== 'APPROVED' && b.status !== 'IN_USE' && b.status !== 'PENDING') return false;
    if (b.user_id !== currentUser?.id) return false;
    const bStart = new Date(b.start_time);
    return format(bStart, 'yyyy-MM-dd') === formData.date;
  });

  const overlappingUserBookings = userBookingsForSelectedDate.filter((b) => {
    const bStart = new Date(b.start_time).getTime();
    const bEnd = new Date(b.end_time).getTime();
    return formStartMs < bEnd && bStart < formEndMs;
  });

  const hasUserOverlap = overlappingUserBookings.length > 0;

  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday

  useEffect(() => {
    fetchData();
  }, [startOfCurrentWeek.getTime(), refreshTrigger]);

  useEffect(() => {
    const socket = socketService.connect();
    if (!socket) return;

    const onCalendarUpdated = () => {
      // Trigger a re-fetch of the calendar data
      setRefreshTrigger((prev) => prev + 1);
    };

    socket.on('calendar_updated', onCalendarUpdated);
    socket.on('room_updated', onCalendarUpdated);
    socket.on('equipment_updated', onCalendarUpdated);

    return () => {
      socket.off('calendar_updated', onCalendarUpdated);
      socket.off('room_updated', onCalendarUpdated);
      socket.off('equipment_updated', onCalendarUpdated);
    };
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const endOfCurrentWeek = addDays(startOfCurrentWeek, 6);
      const startDateStr = format(startOfCurrentWeek, 'yyyy-MM-ddT00:00:00');
      const endDateStr = format(endOfCurrentWeek, 'yyyy-MM-ddT23:59:59');

      const [bookingsRes, roomsRes, equipmentsRes, coursesRes, chemicalsRes] = await Promise.all([
        bookingService.getAll(startDateStr, endDateStr),
        roomService.getAll(),
        equipmentService.getAll(),
        courseService.getAll(),
        chemicalService.getAll(),
      ]);
      setBookings(bookingsRes.data || []);
      setRooms(roomsRes.data || []);
      setEquipments(equipmentsRes.data || []);
      setCourses(coursesRes.data || []);
      setChemicals(chemicalsRes.data || []);
      if (roomsRes.data && roomsRes.data.length > 0) {
        setSelectedRooms(roomsRes.data.map((r: IRoom) => r.id));
      }
      if (equipmentsRes.data && equipmentsRes.data.length > 0) {
        setSelectedEquipments(equipmentsRes.data.map((e: IEquipment) => e.id));
      }
      if (coursesRes.data && coursesRes.data.length > 0) {
        setSelectedCourses(coursesRes.data.map((c: ICourse) => c.id));
      }
      if (chemicalsRes.data && chemicalsRes.data.length > 0) {
        setSelectedChemicals(chemicalsRes.data.map((c: IChemical) => c.id));
      }
    } catch (error: unknown) {
      const err = error as any;
      const msg = err.response?.data?.message || t('calendar_load_error');
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRoom = (id: number) => {
    setSelectedRooms((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  };

  const toggleEquipment = (id: number) => {
    setSelectedEquipments((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const toggleCourse = (id: number) => {
    setSelectedCourses((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const toggleChemical = (id: number) => {
    setSelectedChemicals((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const DAYS = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(startOfCurrentWeek, i);
    const dayNames = [t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')];
    return { name: dayNames[getDay(d)], date: format(d, 'dd/MM'), fullDate: d };
  });


  const gridBookings: Record<string, GridBooking[]> = {};

  bookings.forEach((b) => {
    if (b.status === 'REJECTED') return;
    if (!selectedRooms.includes(b.room_id)) return;
    if (b.equipment_id && !selectedEquipments.includes(b.equipment_id)) return;
    if (b.course_id && !selectedCourses.includes(b.course_id)) return;
    if (
      b.chemical_usages &&
      b.chemical_usages.length > 0 &&
      !b.chemical_usages.some((cu: any) => selectedChemicals.includes(cu.chemical_id))
    ) {
      return;
    }

    const start = new Date(b.start_time);
    const end = new Date(b.end_time);

    DAYS.forEach((day, dayIdx) => {
      if (isSameDay(start, day.fullDate)) {
        const startHour = getHours(start);
        const startMinute = start.getMinutes();
        const durationMinutes = (end.getTime() - start.getTime()) / 60000;

        let type = 'locked';
        if (b.status === 'PENDING') {
          type = currentUser && b.user_id === currentUser.id ? 'pending' : 'locked';
        } else if (b.status === 'APPROVED') {
          type = currentUser && b.user_id === currentUser.id ? 'approved' : 'locked';
        } else if (b.status === 'IN_USE') {
          type = currentUser && b.user_id === currentUser.id ? 'in_use' : 'locked';
        } else if (b.status === 'COMPLETED') {
          type = currentUser && b.user_id === currentUser.id ? 'completed' : 'locked';
        } else if (b.status === 'WAITLISTED') {
          type = 'waitlisted';
        }

        if (startHour >= 7 && startHour <= 22) {
          const room = rooms.find((r) => r.id === b.room_id);
          const eq = b.equipment_id ? equipments.find((e) => e.id === b.equipment_id) : null;
          const course = b.course_id ? courses.find((c) => c.id === b.course_id) : null;
          if (!gridBookings[`${dayIdx}-${startHour}`]) {
            gridBookings[`${dayIdx}-${startHour}`] = [];
          }
          gridBookings[`${dayIdx}-${startHour}`].push({
            type,
            title: course ? `[${course.name}] ${b.purpose}` : b.purpose,
            startMinute,
            durationMinutes,
            roomName: (room ? room.name : '') + (eq ? ` + ${eq.name}` : ''),
            isPast: end < new Date(),
            bookingId: b.id,
            userId: b.user_id,
            status: b.status,
          });
        }
      }
    });
  });

  const getSlot = (dayIdx: number, hour: number) => {
    return gridBookings[`${dayIdx}-${hour}`];
  };

  const canDragSlot = (slot: GridBooking): boolean => {
    if (slot.isPast) return false;
    if (['completed', 'locked', 'waitlisted', 'overdue'].includes(slot.type)) return false;
    if (currentUser?.role === 'STUDENT' && slot.userId !== currentUser.id) return false;
    if (!['PENDING', 'APPROVED'].includes(slot.status)) return false;
    return true;
  };

  const handleDragStart = (e: React.DragEvent, slot: GridBooking, dayIdx: number, hour: number) => {
    if (!canDragSlot(slot)) {
      e.preventDefault();
      return;
    }
    setDraggedBooking({
      bookingId: slot.bookingId,
      durationMinutes: slot.durationMinutes,
      originalDayIdx: dayIdx,
      originalHour: hour,
    });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(slot.bookingId));
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragOver = (e: React.DragEvent, dayIdx: number, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget({ dayIdx, hour });
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, dayIdx: number, hour: number) => {
    e.preventDefault();
    setDropTarget(null);

    if (!draggedBooking) return;

    const targetDate = DAYS[dayIdx].fullDate;
    const newStart = new Date(targetDate);
    newStart.setHours(hour, 0, 0, 0);
    const newEnd = new Date(newStart.getTime() + draggedBooking.durationMinutes * 60 * 1000);

    if (newStart < new Date()) {
      toast.error('Không thể dời lịch vào thời điểm đã qua');
      setDraggedBooking(null);
      return;
    }

    if (dayIdx === draggedBooking.originalDayIdx && hour === draggedBooking.originalHour) {
      setDraggedBooking(null);
      return;
    }

    try {
      await bookingService.reschedule(
        draggedBooking.bookingId,
        newStart.toISOString(),
        newEnd.toISOString(),
      );
      toast.success(`Đã dời lịch sang ${format(newStart, 'HH:mm dd/MM/yyyy')}`);
      fetchData();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Không thể dời lịch';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setDraggedBooking(null);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedBooking(null);
    setDropTarget(null);
  };
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'RESOURCE' && !formData.equipment_id && (!chemicalUsages || chemicalUsages.length === 0)) {
      toast.error('Vui lòng chọn ít nhất 1 Thiết bị hoặc 1 Hóa chất để mượn!');
      return;
    }

    setIsSubmitting(true);
    setHasConflictError(false);
    setSuggestedSlots([]);
    try {
      const startDate = new Date(`${formData.date}T${formData.startTime}:00`);
      const endDate = new Date(startDate.getTime() + parseInt(formData.duration) * 60 * 60 * 1000);

      const payloadEquipmentId = activeTab === 'RESOURCE' ? (formData.equipment_id || undefined) : undefined;
      const payloadChemicals = activeTab === 'RESOURCE' ? chemicalUsages : [];
      const payloadCourseId = activeTab === 'SPACE' ? (formData.course_id || undefined) : undefined;

      await bookingService.create({
        purpose: formData.purpose,
        roomId: formData.room_id,
        equipmentId: payloadEquipmentId,
        courseId: payloadCourseId,
        chemical_usages: payloadChemicals,
        startTime: startDate,
        endTime: endDate,
        status: isWaitlist ? 'WAITLISTED' : undefined,
      });

      toast.success(t('booking_success_pending'));
      setIsModalOpen(false);
      fetchData();
    } catch (error: unknown) {
      const err = error as any;
      const msg = err.response?.data?.message || t('booking_failed');
      const isConflict =
        err.response?.status === 409 ||
        (typeof msg === 'string' &&
          (msg.includes('xung đột') ||
            msg.includes('được đặt') ||
            msg.includes('trùng') ||
            msg.includes('BUFFER')));
      toast.error(Array.isArray(msg) ? msg[0] : msg);

      if (isConflict && formData.room_id) {
        setHasConflictError(true);
        try {
          const durationMinutes = parseInt(formData.duration) * 60;
          const slotsRes = await bookingService.suggestSlots(
            formData.room_id,
            formData.date,
            durationMinutes,
            formData.equipment_id || undefined
          );
          setSuggestedSlots(slotsRes.data || []);
        } catch (sErr) {
          console.error('Lỗi lấy khung giờ gợi ý:', sErr);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 max-w-[1400px] mx-auto animate-in fade-in duration-300">
      <div className="w-full flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-[#E0E0E0] dark:border-slate-800 transition-colors duration-300 z-30">
        <div className="flex items-center gap-3 flex-wrap filter-dropdown">
          <div className="flex items-center gap-2 text-[#757575] dark:text-slate-400 mr-2">
            <Filter className="w-4 h-4" />
            <span className="text-[13px] font-bold uppercase tracking-wider">{t('search_filter')}:</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'room' ? null : 'room')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[13px] font-medium transition-all ${selectedRooms.length > 0 ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400' : 'bg-[#FAFAFA] dark:bg-slate-800/50 border-[#E0E0E0] dark:border-slate-700 text-[#212121] dark:text-slate-300 hover:bg-[#F5F5F5] dark:hover:bg-slate-800'}`}
            >
              {t('lab_room')} {selectedRooms.length > 0 && <span className="bg-blue-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">{selectedRooms.length}</span>}
              <ChevronLeft className={`w-3 h-3 transition-transform ${openDropdown === 'room' ? '-rotate-90' : 'rotate-180'}`} />
            </button>
            {openDropdown === 'room' && (
              <div className="absolute top-full mt-2 left-0 w-[240px] bg-white dark:bg-slate-900 border border-[#E0E0E0] dark:border-slate-800 rounded-xl shadow-xl dark:shadow-slate-900/50 p-3 space-y-2 z-50">
                {rooms.map((room) => (
                  <label key={room.id} className="flex items-center gap-3 cursor-pointer group p-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedRooms.includes(room.id)}
                      onChange={() => toggleRoom(room.id)}
                      className="w-4 h-4 rounded border-[#E0E0E0] dark:border-slate-700 text-[#1E5FA5] dark:text-blue-400 focus:ring-[#1E5FA5]"
                    />
                    <span className="text-[13px] text-[#212121] dark:text-slate-300">{getLocalizedName(room.name, t)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {isResourceMode && equipments.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'equipment' ? null : 'equipment')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[13px] font-medium transition-all ${selectedEquipments.length > 0 ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-400' : 'bg-[#FAFAFA] dark:bg-slate-800/50 border-[#E0E0E0] dark:border-slate-700 text-[#212121] dark:text-slate-300 hover:bg-[#F5F5F5] dark:hover:bg-slate-800'}`}
              >
                {t('equipment')} {selectedEquipments.length > 0 && <span className="bg-indigo-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">{selectedEquipments.length}</span>}
                <ChevronLeft className={`w-3 h-3 transition-transform ${openDropdown === 'equipment' ? '-rotate-90' : 'rotate-180'}`} />
              </button>
              {openDropdown === 'equipment' && (
                <div className="absolute top-full mt-2 left-0 w-[240px] max-h-[300px] overflow-y-auto bg-white dark:bg-slate-900 border border-[#E0E0E0] dark:border-slate-800 rounded-xl shadow-xl p-3 space-y-2 z-50">
                  {equipments.map((eq) => (
                    <label key={eq.id} className="flex items-center gap-3 cursor-pointer group p-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedEquipments.includes(eq.id)}
                        onChange={() => toggleEquipment(eq.id)}
                        className="w-4 h-4 rounded border-[#E0E0E0] dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-[13px] text-[#212121] dark:text-slate-300">{eq.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {isResourceMode && chemicals.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'chemical' ? null : 'chemical')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[13px] font-medium transition-all ${selectedChemicals.length > 0 ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400' : 'bg-[#FAFAFA] dark:bg-slate-800/50 border-[#E0E0E0] dark:border-slate-700 text-[#212121] dark:text-slate-300 hover:bg-[#F5F5F5] dark:hover:bg-slate-800'}`}
              >
                {t('chemicals')} {selectedChemicals.length > 0 && <span className="bg-emerald-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">{selectedChemicals.length}</span>}
                <ChevronLeft className={`w-3 h-3 transition-transform ${openDropdown === 'chemical' ? '-rotate-90' : 'rotate-180'}`} />
              </button>
              {openDropdown === 'chemical' && (
                <div className="absolute top-full mt-2 left-0 w-[240px] max-h-[300px] overflow-y-auto bg-white dark:bg-slate-900 border border-[#E0E0E0] dark:border-slate-800 rounded-xl shadow-xl p-3 space-y-2 z-50">
                  {chemicals.map((c) => (
                    <label key={c.id} className="flex items-center gap-3 cursor-pointer group p-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedChemicals.includes(c.id)}
                        onChange={() => toggleChemical(c.id)}
                        className="w-4 h-4 rounded border-[#E0E0E0] dark:border-slate-700 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-[13px] text-[#212121] dark:text-slate-300">{c.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isResourceMode && courses.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'course' ? null : 'course')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[13px] font-medium transition-all ${selectedCourses.length > 0 ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-400' : 'bg-[#FAFAFA] dark:bg-slate-800/50 border-[#E0E0E0] dark:border-slate-700 text-[#212121] dark:text-slate-300 hover:bg-[#F5F5F5] dark:hover:bg-slate-800'}`}
              >
                {t('subject')} {selectedCourses.length > 0 && <span className="bg-amber-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">{selectedCourses.length}</span>}
                <ChevronLeft className={`w-3 h-3 transition-transform ${openDropdown === 'course' ? '-rotate-90' : 'rotate-180'}`} />
              </button>
              {openDropdown === 'course' && (
                <div className="absolute top-full mt-2 left-0 w-[240px] max-h-[300px] overflow-y-auto bg-white dark:bg-slate-900 border border-[#E0E0E0] dark:border-slate-800 rounded-xl shadow-xl p-3 space-y-2 z-50">
                  {courses.map((c) => (
                    <label key={c.id} className="flex items-center gap-3 cursor-pointer group p-1 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedCourses.includes(c.id)}
                        onChange={() => toggleCourse(c.id)}
                        className="w-4 h-4 rounded border-[#E0E0E0] dark:border-slate-700 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-[13px] text-[#212121] dark:text-slate-300">{getLocalizedName(c.name, t)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3 text-[12px] bg-[#FAFAFA] dark:bg-slate-800/50 px-3 py-1.5 rounded-full border border-[#E0E0E0] dark:border-slate-700">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#FFF8E1] dark:bg-yellow-900/30 border border-[#FFE082] rounded-sm"></div><span className="text-[#757575] dark:text-slate-400">{t('pending')}</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#D6E4F7] dark:bg-blue-900/30 border border-[#1E5FA5] rounded-sm"></div><span className="text-[#757575] dark:text-slate-400">{t('approved')}</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-sm"></div><span className="text-[#757575] dark:text-slate-400">{t('locked')}</span></div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2 px-5 rounded-full font-bold transition-all duration-300 flex items-center gap-2 shadow-sm hover:shadow-blue-500/30 text-[13px] active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> {isResourceMode ? t('borrow_tools') : t('book_schedule')}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl shadow-sm dark:shadow-slate-900/50 border border-[#E0E0E0] dark:border-slate-800 overflow-hidden flex flex-col min-w-0 relative transition-colors duration-300">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md z-20 flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-600 rounded-full animate-spin shadow-lg"></div>
            <p className="mt-4 text-[14px] font-medium text-slate-600 dark:text-slate-300 animate-pulse">
              {t('loading_calendar')}
            </p>
          </div>
        )}

        <div className="p-4 border-b border-[#E0E0E0] dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-[#1E5FA5] dark:text-blue-400 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-[12px] font-bold uppercase tracking-wider">
                {t('schedule')}
              </span>
            </div>
            <h2 className="text-[20px] font-bold text-[#212121] dark:text-slate-100 flex items-center gap-2">
              {format(startOfCurrentWeek, 'dd/MM/yyyy')}
              <span className="text-[#9E9E9E] dark:text-slate-500 font-medium text-[18px]">→</span>
              {format(addDays(startOfCurrentWeek, 6), 'dd/MM/yyyy')}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={format(currentDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                if (e.target.value) {
                  setCurrentDate(new Date(e.target.value));
                }
              }}
              className="px-2 py-1.5 text-[13px] font-medium text-[#212121] dark:text-slate-200 bg-white dark:bg-slate-800 border border-[#E0E0E0] dark:border-slate-700 hover:border-[#1E5FA5] rounded transition-colors focus:outline-none focus:ring-1 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50 cursor-pointer cursor-text color-scheme-light dark:color-scheme-dark"
              title={t('choose_any_day')}
            />
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-[13px] font-bold text-[#757575] dark:text-slate-300 bg-white dark:bg-slate-800 border border-[#E0E0E0] dark:border-slate-700 hover:bg-[#F5F5F5] dark:hover:bg-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-700 hover:text-[#212121] dark:text-slate-100 dark:hover:text-white rounded transition-colors"
            >
              {t('today')}
            </button>
            <div className="w-px h-6 bg-[#E0E0E0] dark:bg-slate-700 mx-1"></div>
            <button
              onClick={() => setCurrentDate(addDays(currentDate, -7))}
              className="p-1.5 text-[#757575] dark:text-slate-400 border border-[#E0E0E0] dark:border-slate-700 hover:bg-[#F5F5F5] dark:hover:bg-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-700 hover:text-[#212121] dark:text-slate-100 dark:hover:text-white rounded transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(addDays(currentDate, 7))}
              className="p-1.5 text-[#757575] dark:text-slate-400 border border-[#E0E0E0] dark:border-slate-700 hover:bg-[#F5F5F5] dark:hover:bg-slate-800 dark:bg-slate-800/50 dark:hover:bg-slate-700 hover:text-[#212121] dark:text-slate-100 dark:hover:text-white rounded transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[#F5F5F5] dark:bg-slate-950 relative p-4 transition-colors duration-300">
          <div className="min-w-[800px] bg-white dark:bg-slate-900 border border-[#E0E0E0] dark:border-slate-800 rounded-lg overflow-hidden shadow-sm dark:shadow-slate-900/50">
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[#E0E0E0] dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-800/50">
              <div className="p-3 border-r border-[#E0E0E0] dark:border-slate-800 flex items-center justify-center">
                <Clock className="w-4 h-4 text-[#9E9E9E] dark:text-slate-500" />
              </div>
              {DAYS.map((d, i) => {
                const isToday = isSameDay(d.fullDate, new Date());
                return (
                  <div
                    key={i}
                    className={`p-3 border-r border-[#E0E0E0] dark:border-slate-800 text-center ${isToday ? 'bg-[#D6E4F7] dark:bg-blue-900/30/30 dark:bg-blue-900/20' : ''}`}
                  >
                    <div
                      className={`text-[14px] font-bold ${isToday ? 'text-[#1E5FA5] dark:text-blue-400' : 'text-[#212121] dark:text-slate-200'}`}
                    >
                      {d.name}
                    </div>
                    <div
                      className={`text-[12px] mt-0.5 ${isToday ? 'text-[#1E5FA5] dark:text-blue-400 font-semibold' : 'text-[#757575] dark:text-slate-400'}`}
                    >
                      {d.date}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="relative bg-white dark:bg-slate-900">
              {HOURS.map((hour) => (
                <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] relative group">
                  <div className="h-[60px] border-b border-r border-[#E0E0E0] dark:border-slate-800 flex items-start justify-center pt-2 text-[12px] font-medium text-[#757575] dark:text-slate-500 bg-[#FAFAFA] dark:bg-slate-800/30">
                    {hour.toString().padStart(2, '0')}:00
                  </div>

                  {DAYS.map((_, dayIdx) => {
                    const slots = getSlot(dayIdx, hour) || [];

                    const cellDate = new Date(DAYS[dayIdx].fullDate);
                    cellDate.setHours(hour, 0, 0, 0);
                    const isPast = cellDate < new Date();

                    let cellClasses =
                      'border-b border-r border-[#E0E0E0] dark:border-slate-800 transition-all relative h-[60px] p-0 ';
                    if (dayIdx === 6) cellClasses = cellClasses.replace('border-r', '');

                    if (isPast) {
                      cellClasses += 'bg-slate-50 dark:bg-slate-800/30 cursor-not-allowed ';
                    } else {
                      cellClasses +=
                        'bg-white dark:bg-slate-900 hover:bg-[#F5F5F5] dark:hover:bg-slate-800 cursor-pointer ';
                    }

                    const isDropTarget = dropTarget?.dayIdx === dayIdx && dropTarget?.hour === hour;
                    if (isDropTarget && draggedBooking) {
                      cellClasses += 'ring-2 ring-inset ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 ';
                    }

                    return (
                      <div
                        key={dayIdx}
                        className={cellClasses}
                        onClick={() => {
                          if (isPast || draggedBooking) return;
                          setFormData((prev) => ({
                            ...prev,
                            date: format(DAYS[dayIdx].fullDate, 'yyyy-MM-dd'),
                            startTime: `${hour.toString().padStart(2, '0')}:00`,
                          }));
                          setIsModalOpen(true);
                        }}
                        onDragOver={(e) => !isPast && handleDragOver(e, dayIdx, hour)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => !isPast && handleDrop(e, dayIdx, hour)}
                      >
                        {slots.map((slot: GridBooking, idx: number) => {
                          let slotClasses =
                            'absolute left-1 right-1 rounded-sm overflow-hidden z-10 shadow-sm mix-blend-multiply dark:mix-blend-screen ';

                          if (slot.isPast) {
                            slotClasses +=
                              'bg-gray-100/90 dark:bg-slate-800/80 border border-gray-300 dark:border-slate-700 cursor-not-allowed text-gray-400 dark:text-gray-500 flex items-center justify-center flex-col ';
                          } else if (slot.type === 'locked') {
                            slotClasses +=
                              'bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800/50 cursor-not-allowed text-red-500 dark:text-red-400 flex items-center justify-center flex-col';
                          } else if (slot.type === 'waitlisted') {
                            slotClasses +=
                              'bg-amber-50/90 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 cursor-not-allowed text-amber-500 dark:text-amber-400 flex items-center justify-center flex-col';
                          } else if (slot.type === 'pending') {
                            slotClasses +=
                              'bg-[#FFF8E1] dark:bg-yellow-900/40 border-l-4 border-l-[#FFC107] dark:border-l-yellow-600 border-t border-r border-b border-[#FFE082] dark:border-yellow-700/50 cursor-pointer p-1';
                          } else if (slot.type === 'approved') {
                            slotClasses +=
                              'bg-[#D6E4F7] dark:bg-blue-900/40 border-l-4 border-l-[#1E5FA5] dark:border-l-blue-500 border-t border-r border-b border-[#BBDEFB] dark:border-blue-800/50 cursor-pointer p-1';
                          } else if (slot.type === 'in_use') {
                            slotClasses +=
                              'bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-l-emerald-600 dark:border-l-emerald-500 border-t border-r border-b border-emerald-200 dark:border-emerald-800/50 cursor-pointer p-1';
                          } else if (slot.type === 'completed') {
                            slotClasses +=
                              'bg-slate-100 dark:bg-slate-800/50 border-l-4 border-l-slate-400 dark:border-l-slate-600 border-t border-r border-b border-slate-200 dark:border-slate-700/50 cursor-pointer p-1';
                          }

                          if (isPast) {
                            slotClasses += ' grayscale opacity-[0.85] cursor-not-allowed';
                          }

                          const isDraggable = canDragSlot(slot);

                          const tooltipText = slot.isPast
                            ? `Đã kết thúc: ${slot.title}\nPhòng: ${slot.roomName}`
                            : `${slot.title}\nPhòng: ${slot.roomName}\nThời gian: ${slot.durationMinutes} phút\nTrạng thái: ${slot.type === 'approved' ? 'Đã duyệt' : slot.type === 'pending' ? 'Chờ duyệt' : slot.type}`;

                          return (
                            <div
                              key={idx}
                              className={`${slotClasses}${isDraggable ? ' cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-indigo-400/50 hover:scale-[1.02] transition-transform duration-200' : ''}`}
                              style={{
                                top: `${slot.startMinute}px`,
                                height: `${slot.durationMinutes}px`,
                                minHeight: '24px',
                              }}
                              draggable={isDraggable}
                              title={tooltipText}
                              onDragStart={(e) => isDraggable && handleDragStart(e, slot, dayIdx, hour)}
                              onDragEnd={handleDragEnd}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {slot.isPast ? (
                                <>
                                  <Clock className="w-3 h-3 mb-0.5 opacity-50" />
                                  <span className="text-[10px] font-bold text-center px-1 leading-tight line-clamp-2 opacity-60">
                                    {slot.roomName || t('booked')}
                                  </span>
                                </>
                              ) : slot.type === 'locked' ? (
                                <>
                                  <Lock className="w-3 h-3 mb-0.5" />
                                  <span className="text-[10px] font-bold text-center px-1 leading-tight line-clamp-2">
                                    {slot.roomName || t('booked')}
                                  </span>
                                </>
                              ) : slot.type === 'waitlisted' ? (
                                <>
                                  <Hourglass className="w-3 h-3 mb-0.5" />
                                  <span className="text-[10px] font-bold text-center px-1 leading-tight line-clamp-2">
                                    {slot.roomName || t('waitlist_short')}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <div
                                    className={`text-[11px] font-bold line-clamp-1 leading-tight ${slot.type === 'pending'
                                        ? 'text-[#F57F17] dark:text-yellow-500'
                                        : slot.type === 'in_use'
                                          ? 'text-emerald-700 dark:text-emerald-400 animate-pulse'
                                          : slot.type === 'completed'
                                            ? 'text-slate-500 dark:text-slate-450 line-through opacity-70'
                                            : 'text-[#1E5FA5] dark:text-blue-400'
                                      }`}
                                  >
                                    {slot.title}
                                  </div>
                                  <div
                                    className={`text-[10px] line-clamp-1 leading-tight opacity-80 ${slot.type === 'pending'
                                        ? 'text-[#F57F17] dark:text-yellow-500'
                                        : slot.type === 'in_use'
                                          ? 'text-emerald-600 dark:text-emerald-450'
                                          : slot.type === 'completed'
                                            ? 'text-slate-450 dark:text-slate-500'
                                            : 'text-[#1E5FA5] dark:text-blue-400'
                                      }`}
                                  >
                                    {slot.roomName}
                                  </div>
                                  {slot.durationMinutes >= 45 && (
                                    <div
                                      className={`text-[9px] mt-0.5 flex items-center gap-1 ${slot.type === 'pending'
                                          ? 'text-[#F57F17] dark:text-yellow-600'
                                          : slot.type === 'in_use'
                                            ? 'text-emerald-750 dark:text-emerald-500 font-bold'
                                            : slot.type === 'completed'
                                              ? 'text-slate-450 dark:text-slate-500'
                                              : 'text-[#1E5FA5] dark:text-blue-500'
                                        }`}
                                    >
                                      {slot.type === 'pending' ? (
                                        <>
                                          <Info className="w-2.5 h-2.5" /> {t('pending_approval')}
                                        </>
                                      ) : slot.type === 'in_use' ? (
                                        'Đang thực hành'
                                      ) : slot.type === 'completed' ? (
                                        'Đã kết thúc'
                                      ) : (
                                        t('your_schedule')
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {Object.values(gridBookings).flat().length === 0 && !isLoading && (
              <div className="absolute inset-0 z-0 flex flex-col items-center justify-center pointer-events-none opacity-60">
                <div className="w-32 h-32 mb-4 rounded-full bg-blue-50 dark:bg-slate-800/50 flex items-center justify-center shadow-inner">
                  <Calendar className="w-16 h-16 text-blue-300 dark:text-slate-600" />
                </div>
                <p className="text-[#94A3B8] font-medium">{t('today')} phòng Lab đang trống</p>
                <p className="text-[12px] text-[#94A3B8]">Hãy là người đầu tiên đặt phòng nhé!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl dark:shadow-slate-900/50 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20 dark:border-slate-700/50">
            <div className="p-4 border-b border-[#E0E0E0]/50 dark:border-slate-800/50 flex justify-between items-center bg-[#FAFAFA]/50 dark:bg-slate-800/30">
              <h3 className="font-bold text-[#212121] dark:text-slate-100 text-[16px]">
                {isResourceMode ? 'Mượn Dụng Cụ Học Tập' : t('book_schedule')}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-[#757575] dark:text-slate-400 hover:bg-[#E0E0E0] dark:hover:bg-slate-700 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="p-6 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                  Mục đích sử dụng <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder={t('ex_purpose')}
                  className="w-full px-3 py-2 border border-[#E0E0E0] dark:border-slate-800 rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5] dark:focus:border-blue-500 focus:ring-1 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                  {activeTab === 'SPACE' ? 'Chọn phòng Lab' : 'Nơi sử dụng (Phòng Lab)'} <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.room_id}
                  onChange={(e) =>
                    setFormData({ ...formData, room_id: e.target.value, equipment_id: '' })
                  }
                  className="w-full px-3 py-2 border border-[#E0E0E0] dark:border-slate-800 rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5] dark:focus:border-blue-500 focus:ring-1 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50"
                  disabled={isSubmitting}
                >
                  <option value="">{t('select_room')}</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({t('capacity')}: {r.capacity})
                    </option>
                  ))}
                </select>
              </div>

              {activeTab === 'RESOURCE' && formData.room_id &&
                equipments.filter((eq) => eq.room_id.toString() === formData.room_id).length >
                0 && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                      Thiết bị đi kèm (Tùy chọn)
                    </label>
                    <select
                      value={formData.equipment_id}
                      onChange={(e) => setFormData({ ...formData, equipment_id: e.target.value })}
                      className="w-full px-3 py-2 border border-[#E0E0E0] dark:border-slate-800 rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5] dark:focus:border-blue-500 focus:ring-1 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50"
                      disabled={isSubmitting}
                    >
                      <option value="">-- Không chọn thiết bị --</option>
                      {equipments
                        .filter((eq) => eq.room_id.toString() === formData.room_id)
                        .map((eq) => (
                          <option key={eq.id} value={eq.id}>
                            {eq.name} - S/N: {eq.serial_number}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

              {activeTab === 'SPACE' && isInstructorOrAdmin && courses.length > 0 && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                    {t('course_instructor_only', 'Học phần (Dành cho Giảng viên)')}
                  </label>
                  <select
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E0E0] dark:border-slate-800 rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5] dark:focus:border-blue-500 focus:ring-1 focus:ring-[#1E5FA5] dark:focus:ring-blue-500/50"
                    disabled={isSubmitting}
                  >
                    <option value="">-- {t('no_course_attached', 'Không gắn vào học phần')} --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === 'RESOURCE' && (
                <div className="animate-in slide-in-from-top-2 duration-300 border border-[#E0E0E0] dark:border-slate-800 rounded-md p-3 bg-[#FAFAFA] dark:bg-slate-800/30">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[13px] font-medium text-[#757575] dark:text-slate-400">
                      Hóa chất tiêu hao (Tùy chọn)
                    </label>
                    <button
                      type="button"
                      onClick={() => setChemicalUsages([...chemicalUsages, { chemical_id: chemicals[0]?.id || 0, quantity: 1 }])}
                      className="text-[12px] font-bold text-[#1E5FA5] dark:text-blue-400 hover:text-blue-700 transition-colors"
                      disabled={chemicals.length === 0}
                    >
                      + Thêm
                    </button>
                  </div>

                  {chemicalUsages.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {chemicalUsages.map((usage: { chemical_id: number; quantity: number }, index: number) => {
                        const selectedChem = chemicals.find(c => c.id === usage.chemical_id);
                        return (
                          <div key={index} className="flex gap-2 items-start">
                            <select
                              value={usage.chemical_id}
                              onChange={(e) => {
                                const newArr = [...chemicalUsages];
                                newArr[index].chemical_id = Number(e.target.value);
                                setChemicalUsages(newArr);
                              }}
                              className="flex-1 px-2 py-1.5 border border-[#E0E0E0] dark:border-slate-700 rounded text-[13px] focus:outline-none focus:border-[#1E5FA5] dark:bg-slate-900"
                            >
                              {chemicals.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name} (Còn {c.quantity_stock} {c.unit})
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              max={selectedChem?.quantity_stock || 100}
                              value={usage.quantity}
                              onChange={(e) => {
                                const newArr = [...chemicalUsages];
                                newArr[index].quantity = Number(e.target.value);
                                setChemicalUsages(newArr);
                              }}
                              className="w-20 px-2 py-1.5 border border-[#E0E0E0] dark:border-slate-700 rounded text-[13px] focus:outline-none focus:border-[#1E5FA5] dark:bg-slate-900"
                              title="Số lượng"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newArr = [...chemicalUsages];
                                newArr.splice(index, 1);
                                setChemicalUsages(newArr);
                              }}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded mt-0.5"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                    Ngày <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E0E0] dark:border-slate-800 rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5] dark:focus:border-blue-500"
                    disabled={isSubmitting}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                    Giờ bắt đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E0E0E0] dark:border-slate-800 rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5] dark:focus:border-blue-500"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#757575] dark:text-slate-400 mb-1">
                  Thời lượng (Giờ) <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E0E0E0] dark:border-slate-800 rounded-md text-[14px] focus:outline-none focus:border-[#1E5FA5] dark:focus:border-blue-500"
                  disabled={isSubmitting}
                >
                  <option value="1">{t('hour_1')}</option>
                  <option value="2">{t('hour_2')}</option>
                  <option value="3">{t('hour_3')}</option>
                  <option value="4">{t('hour_4')}</option>
                  <option value="5">{t('hour_5')}</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isWaitlist}
                    onChange={(e) => setIsWaitlist(e.target.checked)}
                    className="w-4 h-4 rounded border-[#E0E0E0] dark:border-slate-700 text-amber-500 focus:ring-amber-500/50"
                  />
                  <span className="text-[13px] font-medium text-[#212121] dark:text-slate-300 group-hover:text-amber-500 transition-colors">
                    {isResourceMode
                      ? 'Tham gia Danh sách chờ (nếu dụng cụ hoặc phòng bị trùng)'
                      : t('join_waitlist_checkbox')}
                  </span>
                </label>
              </div>

              {hasOverlapCurrentSelection && !isWaitlist && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg animate-shake">
                  <div className="text-[12px] font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> Khung giờ bạn chọn đã bị trùng lặp với người khác. Vui lòng chọn giờ khác hoặc tick chọn "Tham gia Danh sách chờ".
                  </div>
                </div>
              )}

              {hasUserOverlap && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg animate-shake mt-2">
                  <div className="text-[12px] font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                    <AlertCircle className="w-5 h-5 shrink-0" /> 
                    <span>
                      🚫 <strong>Trùng lịch cá nhân:</strong> Bạn đã có lịch sử dụng {rooms.find(r => r.id === overlappingUserBookings[0].room_id)?.name || 'phòng khác'} vào khung giờ {format(new Date(overlappingUserBookings[0].start_time), 'HH:mm')} - {format(new Date(overlappingUserBookings[0].end_time), 'HH:mm')}. Bạn không thể đặt 2 phòng trong cùng một thời điểm!
                    </span>
                  </div>
                </div>
              )}

              {hasConflictError && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg space-y-2 animate-shake shadow-md shadow-amber-500/10">
                  <div className="text-[12px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <Hourglass className="w-4 h-4" />
                    Không gian bị trùng lịch. Gợi ý 5 khung giờ trống (Sliding Window):
                  </div>
                  {suggestedSlots.length === 0 ? (
                    <div className="text-[11px] text-[#757575] dark:text-slate-400 italic">
                      Không có khung giờ nào trống trong 3 ngày tới.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {suggestedSlots.map((slot, sIdx) => {
                        const sDate = new Date(slot.start_time);
                        const eDate = new Date(slot.end_time);
                        const dateLabel = format(sDate, 'dd/MM');
                        const timeLabel = `${format(sDate, 'HH:mm')} - ${format(eDate, 'HH:mm')}`;
                        return (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                date: format(sDate, 'yyyy-MM-dd'),
                                startTime: format(sDate, 'HH:mm'),
                              });
                              setHasConflictError(false);
                              setSuggestedSlots([]);
                            }}
                            className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold text-[#1E5FA5] dark:text-blue-400 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors flex items-center justify-between"
                          >
                            <span>
                              📅 {dateLabel} | ⏰ {timeLabel}
                            </span>
                            <span className="text-[10px] text-blue-500 font-medium">Chọn</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <div className="pt-4 flex justify-end gap-3 border-t border-[#E0E0E0] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-[14px] font-medium text-[#757575] dark:text-slate-400 hover:bg-[#F5F5F5] dark:hover:bg-slate-800 dark:bg-slate-800/50 rounded-md transition-colors"
                  disabled={isSubmitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-[14px] font-bold text-white rounded-md transition-all duration-300 flex items-center gap-2 shadow-sm ${
                    (isSubmitting || (hasOverlapCurrentSelection && !isWaitlist) || hasUserOverlap) ? 'opacity-50 cursor-not-allowed bg-neutral-400 dark:bg-slate-700' 
                    : isWaitlist ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/20' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20'
                  }`}
                  disabled={isSubmitting || (hasOverlapCurrentSelection && !isWaitlist) || hasUserOverlap}
                >
                  {isSubmitting && <LoadingSpinner size={16} className="p-0 text-white" />}
                  {isSubmitting
                    ? t('processing')
                    : isWaitlist
                      ? t('btn_join_waitlist')
                      : t('confirm_booking')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
