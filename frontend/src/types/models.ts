import { UserRole, BookingStatus, DeviceStatus } from '../constants/roles';

export interface IUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface IRoom {
  id: string;
  name: string;
  capacity: number;
  location: string;
  isAvailable: boolean;
  devices: IDevice[];
}

export interface IDevice {
  id: string;
  name: string;
  status: DeviceStatus;
  roomId: string;
}

export interface IBookingRequest {
  userId: string;
  roomId: string;
  startTime: string;
  endTime: string;
  purpose: string;
  membersCount: number;
}

export interface IBookingResponse extends IBookingRequest {
  id: string;
  status: BookingStatus;
  createdAt: string;
}
