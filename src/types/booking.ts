import type { RoomType } from './room';

export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'extended';

export interface Booking {
  id: string;
  orderNo: string;
  roomId: string;
  roomName: string;
  roomNo: string;
  roomType: RoomType;
  customerName: string;
  customerPhone: string;
  peopleCount: number;
  date: string;
  startTime: string;
  endTime: string;
  originalEndTime: string;
  duration: number;
  status: BookingStatus;
  baseAmount: number;
  packageAmount: number;
  extendAmount: number;
  totalAmount: number;
  paidAmount: number;
  packageIds: string[];
  checkInTime?: string;
  checkOutTime?: string;
  createdAt: string;
  queueNo?: string;
  counterId?: string;
  queueItemId?: string;
}

export interface BookingCreateRequest {
  peopleCount: number;
  preferredRoomType?: RoomType;
  date: string;
  startTime: string;
  duration: number;
  customerName: string;
  customerPhone: string;
  packageIds: string[];
}

export interface ExtendBookingRequest {
  bookingId: string;
  extendHours: number;
}

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: '待确认',
  confirmed: '已确认',
  checked_in: '已入场',
  completed: '已完成',
  cancelled: '已取消',
  extended: '已续钟'
};
