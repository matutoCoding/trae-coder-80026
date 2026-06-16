export type RoomType = 'small' | 'medium' | 'large' | 'vip' | 'luxury';

export type RoomStatus = 'available' | 'occupied' | 'reserved' | 'maintenance';

export interface TimeSlot {
  startTime: string;
  endTime: string;
  date: string;
}

export interface Room {
  id: string;
  name: string;
  roomNo: string;
  type: RoomType;
  capacity: number;
  floor: number;
  hourlyRate: number;
  status: RoomStatus;
  facilities: string[];
  description: string;
  currentBookingId?: string;
}

export interface RoomSchedule {
  roomId: string;
  date: string;
  bookings: RoomBookingSlot[];
}

export interface RoomBookingSlot {
  bookingId: string;
  startTime: string;
  endTime: string;
  status: RoomStatus;
}

export const ROOM_TYPE_LABEL: Record<RoomType, string> = {
  small: '小包厢',
  medium: '中包厢',
  large: '大包厢',
  vip: 'VIP包厢',
  luxury: '豪华包厢'
};

export const ROOM_STATUS_LABEL: Record<RoomStatus, string> = {
  available: '空闲',
  occupied: '使用中',
  reserved: '已预订',
  maintenance: '维护中'
};
