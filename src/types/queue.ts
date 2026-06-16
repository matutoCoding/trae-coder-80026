import type { RoomType } from './room';

export type QueueStatus = 'waiting' | 'calling' | 'served' | 'missed' | 'cancelled';

export interface Counter {
  id: string;
  name: string;
  counterNo: string;
  status: 'online' | 'offline' | 'busy';
  currentServingCount: number;
  totalServedCount: number;
  waitingQueueCount: number;
  avgWaitTime: number;
  lastActivityTime: string;
}

export interface QueueItem {
  id: string;
  queueNo: string;
  roomType: RoomType;
  peopleCount: number;
  customerName: string;
  customerPhone: string;
  status: QueueStatus;
  counterId?: string;
  bookingId?: string;
  estimatedWaitTime: number;
  createdAt: string;
  calledAt?: string;
  servedAt?: string;
}

export interface QueueStats {
  totalWaiting: number;
  totalCalling: number;
  totalServed: number;
  avgWaitTime: number;
  counters: Counter[];
}

export const QUEUE_STATUS_LABEL: Record<QueueStatus, string> = {
  waiting: '等待中',
  calling: '叫号中',
  served: '已服务',
  missed: '已过号',
  cancelled: '已取消'
};
