import { UserRole, BookingStatus } from '../constants/roles';

export interface IUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  department?: string | null;
  student_class?: string | null;
  blacklist_reason?: string | null;
  trust_score?: number;
  phone?: string;
  is_mfa_enabled?: boolean;
  created_at: string;
}

export interface IRoom {
  id: number;
  name: string;
  location: string;
  capacity: number;
  has_air_conditioner: boolean;
  status: string;
  is_deleted: boolean;
  image_url?: string;
  _count?: {
    equipment: number;
  };
  equipment?: IEquipment[];
}

export interface IEquipment {
  id: number;
  name: string;
  serial_number: string;
  status: string;
  room_id: number;
  last_maintenance?: string | null;
  is_deleted: boolean;
  updated_at?: string;
}

export interface IBooking {
  id: number;
  user_id: number;
  room_id: number;
  equipment_id?: number | null;
  course_id?: number | null;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  purpose: string;
  created_at: string;
  user?: Partial<IUser>;
  room?: Partial<IRoom>;
  equipment?: Partial<IEquipment>;
  course?: Partial<ICourse>;
  chemical_usages?: any[];
  updated_at?: string;
}

export interface ICourse {
  id: number;
  code: string;
  name: string;
  instructor_id: number;
  semester: string;
  academic_year: string;
  instructor?: Partial<IUser>;
  created_at: string;
}

export interface IChemical {
  id: number;
  name: string;
  unit: string;
  quantity_stock: number;
  expiration_date?: string | null;
  status: string;
  formula?: string;
  storage_conditions?: string;
  min_stock_alert?: number;
}

export interface IReport {
  id: number;
  title: string;
  description: string;
  status: string;
  user_id: number;
  equipment_id?: number | null;
  room_id?: number | null;
  created_at: string;
  user?: Partial<IUser>;
  equipment?: Partial<IEquipment>;
  room?: Partial<IRoom>;
}

export interface INotification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  type?: string;
  created_at: string | Date;
}
