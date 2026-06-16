import { create } from 'zustand';
import type { Counter, QueueItem, QueueStatus } from '../types/queue';
import type { RoomType } from '../types/room';
import { mockCounters, mockQueueItems } from '../data/bookings';
import { findLeastLoadedCounter, rebalanceQueues, getAllCountersLoad } from '../utils/loadBalancer';
import { generateQueueNo } from '../utils/timeUtils';

interface QueueState {
  counters: Counter[];
  queueItems: QueueItem[];
  setCounters: (counters: Counter[]) => void;
  setQueueItems: (queueItems: QueueItem[]) => void;
  addToQueue: (params: {
    roomType: RoomType;
    peopleCount: number;
    customerName: string;
    customerPhone: string;
  }) => QueueItem | null;
  callNext: (counterId: string) => QueueItem | null;
  updateQueueStatus: (queueItemId: string, status: QueueStatus) => void;
  markServed: (queueItemId: string, bookingId: string) => void;
  markMissed: (queueItemId: string) => void;
  cancelQueue: (queueItemId: string) => void;
  updateCounterStatus: (counterId: string, status: Counter['status']) => void;
  getCountersLoad: () => ReturnType<typeof getAllCountersLoad>;
  triggerRebalance: () => void;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  counters: mockCounters,
  queueItems: mockQueueItems,

  setCounters: (counters) => set({ counters }),

  setQueueItems: (queueItems) => set({ queueItems }),

  addToQueue: (params) => {
    console.log('[QueueStore] 加入排队', params);

    const assignment = findLeastLoadedCounter(get().counters, get().queueItems);
    if (!assignment) {
      console.error('[QueueStore] 无可用前台窗口');
      return null;
    }

    const seq = get().queueItems.filter(q => q.roomType === params.roomType).length + 1;

    const newItem: QueueItem = {
      id: `q-${Date.now()}`,
      queueNo: generateQueueNo(params.roomType, seq),
      roomType: params.roomType,
      peopleCount: params.peopleCount,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      status: 'waiting',
      counterId: assignment.counterId,
      estimatedWaitTime: 15,
      createdAt: new Date().toISOString()
    };

    set((state) => ({
      queueItems: [...state.queueItems, newItem],
      counters: state.counters.map(c =>
        c.id === assignment.counterId
          ? { ...c, waitingQueueCount: c.waitingQueueCount + 1 }
          : c
      )
    }));

    console.log('[QueueStore] 排队成功', newItem);
    return newItem;
  },

  callNext: (counterId) => {
    console.log('[QueueStore] 叫号', counterId);

    const { queueItems } = get();
    const waitingItems = queueItems
      .filter(q => q.status === 'waiting' && q.counterId === counterId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (waitingItems.length === 0) {
      console.log('[QueueStore] 当前窗口无等待客人');
      return null;
    }

    const nextItem = waitingItems[0];
    const now = new Date().toISOString();

    set((state) => ({
      queueItems: state.queueItems.map(q =>
        q.id === nextItem.id
          ? { ...q, status: 'calling' as QueueStatus, calledAt: now }
          : q
      ),
      counters: state.counters.map(c =>
        c.id === counterId
          ? { ...c, currentServingCount: c.currentServingCount + 1, lastActivityTime: now }
          : c
      )
    }));

    console.log('[QueueStore] 叫号成功', nextItem);
    return nextItem;
  },

  updateQueueStatus: (queueItemId, status) => set((state) => ({
    queueItems: state.queueItems.map(q =>
      q.id === queueItemId ? { ...q, status } : q
    )
  })),

  markServed: (queueItemId, bookingId) => {
    console.log('[QueueStore] 完成服务', { queueItemId, bookingId });
    const item = get().queueItems.find(q => q.id === queueItemId);
    if (!item) return;

    const now = new Date().toISOString();
    set((state) => ({
      queueItems: state.queueItems.map(q =>
        q.id === queueItemId
          ? { ...q, status: 'served' as QueueStatus, servedAt: now, bookingId }
          : q
      ),
      counters: state.counters.map(c =>
        c.id === item.counterId
          ? {
              ...c,
              currentServingCount: Math.max(0, c.currentServingCount - 1),
              totalServedCount: c.totalServedCount + 1,
              waitingQueueCount: Math.max(0, c.waitingQueueCount - 1),
              lastActivityTime: now
            }
          : c
      )
    }));
  },

  markMissed: (queueItemId) => {
    console.log('[QueueStore] 过号', queueItemId);
    const item = get().queueItems.find(q => q.id === queueItemId);
    if (!item) return;

    set((state) => ({
      queueItems: state.queueItems.map(q =>
        q.id === queueItemId ? { ...q, status: 'missed' as QueueStatus } : q
      ),
      counters: state.counters.map(c =>
        c.id === item.counterId
          ? {
              ...c,
              currentServingCount: Math.max(0, c.currentServingCount - 1),
              waitingQueueCount: Math.max(0, c.waitingQueueCount - 1)
            }
          : c
      )
    }));
  },

  cancelQueue: (queueItemId) => {
    console.log('[QueueStore] 取消排队', queueItemId);
    const item = get().queueItems.find(q => q.id === queueItemId);
    if (!item) return;

    set((state) => ({
      queueItems: state.queueItems.map(q =>
        q.id === queueItemId ? { ...q, status: 'cancelled' as QueueStatus } : q
      ),
      counters: state.counters.map(c =>
        c.id === item.counterId
          ? { ...c, waitingQueueCount: Math.max(0, c.waitingQueueCount - 1) }
          : c
      )
    }));
  },

  updateCounterStatus: (counterId, status) => set((state) => ({
    counters: state.counters.map(c =>
      c.id === counterId ? { ...c, status } : c
    )
  })),

  getCountersLoad: () => getAllCountersLoad(get().counters, get().queueItems),

  triggerRebalance: () => {
    console.log('[QueueStore] 触发负载均衡重排');
    const reassignment = rebalanceQueues(get().counters, get().queueItems);

    if (reassignment.size > 0) {
      set((state) => ({
        queueItems: state.queueItems.map(q => {
          const newCounterId = reassignment.get(q.id);
          return newCounterId ? { ...q, counterId: newCounterId } : q;
        })
      }));
      console.log(`[QueueStore] 已重新分配 ${reassignment.size} 个排队项`);
    }
  }
}));
