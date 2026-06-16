import { create } from 'zustand';
import type { Counter, QueueItem, QueueStatus } from '../types/queue';
import type { RoomType } from '../types/room';
import { mockCounters, mockQueueItems } from '../data/bookings';
import { findLeastLoadedCounter, rebalanceQueues, getAllCountersLoad } from '../utils/loadBalancer';
import { generateQueueNo } from '../utils/timeUtils';
import { saveToStorage, loadFromStorage } from '../utils/persist';

const STORAGE_KEY_COUNTERS = 'counters';
const STORAGE_KEY_QUEUE_ITEMS = 'queueItems';

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
    isVip?: boolean;
  }) => QueueItem | null;
  callNext: (counterId: string) => QueueItem | null;
  updateQueueStatus: (queueItemId: string, status: QueueStatus) => void;
  updateBookingId: (queueItemId: string, bookingId: string) => void;
  markServed: (queueItemId: string, bookingId: string) => void;
  markMissed: (queueItemId: string) => void;
  cancelQueue: (queueItemId: string) => void;
  transferToCounter: (queueItemId: string, targetCounterId: string) => boolean;
  moveToFront: (queueItemId: string, options?: { targetCounterId?: string; reason?: string }) => boolean;
  updateCounterStatus: (counterId: string, status: Counter['status']) => void;
  getCountersLoad: () => ReturnType<typeof getAllCountersLoad>;
  triggerRebalance: () => void;
  resetToMock: () => void;
}

const initialCounters = loadFromStorage<Counter[]>(STORAGE_KEY_COUNTERS, mockCounters);
const initialQueueItems = loadFromStorage<QueueItem[]>(STORAGE_KEY_QUEUE_ITEMS, mockQueueItems);

export const useQueueStore = create<QueueState>((set, get) => ({
  counters: initialCounters,
  queueItems: initialQueueItems,

  setCounters: (counters) => {
    saveToStorage(STORAGE_KEY_COUNTERS, counters);
    set({ counters });
  },

  setQueueItems: (queueItems) => {
    saveToStorage(STORAGE_KEY_QUEUE_ITEMS, queueItems);
    set({ queueItems });
  },

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
      createdAt: new Date().toISOString(),
      isVip: params.isVip || false,
      priority: params.isVip ? 100 : 0
    };

    set((state) => {
      const newQueueItems = [...state.queueItems, newItem];
      const newCounters = state.counters.map(c =>
        c.id === assignment.counterId
          ? { ...c, waitingQueueCount: c.waitingQueueCount + 1 }
          : c
      );
      saveToStorage(STORAGE_KEY_QUEUE_ITEMS, newQueueItems);
      saveToStorage(STORAGE_KEY_COUNTERS, newCounters);
      return {
        queueItems: newQueueItems,
        counters: newCounters
      };
    });

    console.log('[QueueStore] 排队成功', newItem);
    return newItem;
  },

  callNext: (counterId) => {
    console.log('[QueueStore] 叫号', counterId);

    const { queueItems } = get();
    const waitingItems = queueItems
      .filter(q => q.status === 'waiting' && q.counterId === counterId)
      .sort((a, b) => {
        const prioDiff = (b.priority || 0) - (a.priority || 0);
        if (prioDiff !== 0) return prioDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    if (waitingItems.length === 0) {
      console.log('[QueueStore] 当前窗口无等待客人');
      return null;
    }

    const nextItem = waitingItems[0];
    const now = new Date().toISOString();

    set((state) => {
      const newQueueItems = state.queueItems.map(q =>
        q.id === nextItem.id
          ? { ...q, status: 'calling' as QueueStatus, calledAt: now }
          : q
      );
      const newCounters = state.counters.map(c =>
        c.id === counterId
          ? { ...c, currentServingCount: c.currentServingCount + 1, lastActivityTime: now }
          : c
      );
      saveToStorage(STORAGE_KEY_QUEUE_ITEMS, newQueueItems);
      saveToStorage(STORAGE_KEY_COUNTERS, newCounters);
      return {
        queueItems: newQueueItems,
        counters: newCounters
      };
    });

    console.log('[QueueStore] 叫号成功', nextItem);
    return nextItem;
  },

  updateQueueStatus: (queueItemId, status) => set((state) => {
    const newQueueItems = state.queueItems.map(q =>
      q.id === queueItemId ? { ...q, status } : q
    );
    saveToStorage(STORAGE_KEY_QUEUE_ITEMS, newQueueItems);
    return { queueItems: newQueueItems };
  }),

  updateBookingId: (queueItemId, bookingId) => set((state) => {
    const newQueueItems = state.queueItems.map(q =>
      q.id === queueItemId ? { ...q, bookingId } : q
    );
    saveToStorage(STORAGE_KEY_QUEUE_ITEMS, newQueueItems);
    return { queueItems: newQueueItems };
  }),

  markServed: (queueItemId, bookingId) => {
    console.log('[QueueStore] 完成服务', { queueItemId, bookingId });
    const item = get().queueItems.find(q => q.id === queueItemId);
    if (!item) return;

    const now = new Date().toISOString();
    set((state) => {
      const newQueueItems = state.queueItems.map(q =>
        q.id === queueItemId
          ? { ...q, status: 'served' as QueueStatus, servedAt: now, bookingId }
          : q
      );
      const newCounters = state.counters.map(c =>
        c.id === item.counterId
          ? {
              ...c,
              currentServingCount: Math.max(0, c.currentServingCount - 1),
              totalServedCount: c.totalServedCount + 1,
              waitingQueueCount: Math.max(0, c.waitingQueueCount - 1),
              lastActivityTime: now
            }
          : c
      );
      saveToStorage(STORAGE_KEY_QUEUE_ITEMS, newQueueItems);
      saveToStorage(STORAGE_KEY_COUNTERS, newCounters);
      return {
        queueItems: newQueueItems,
        counters: newCounters
      };
    });
  },

  markMissed: (queueItemId) => {
    console.log('[QueueStore] 过号', queueItemId);
    const item = get().queueItems.find(q => q.id === queueItemId);
    if (!item) return;

    set((state) => {
      const newQueueItems = state.queueItems.map(q =>
        q.id === queueItemId ? { ...q, status: 'missed' as QueueStatus } : q
      );
      const newCounters = state.counters.map(c =>
        c.id === item.counterId
          ? {
              ...c,
              currentServingCount: Math.max(0, c.currentServingCount - 1),
              waitingQueueCount: Math.max(0, c.waitingQueueCount - 1)
            }
          : c
      );
      saveToStorage(STORAGE_KEY_QUEUE_ITEMS, newQueueItems);
      saveToStorage(STORAGE_KEY_COUNTERS, newCounters);
      return {
        queueItems: newQueueItems,
        counters: newCounters
      };
    });
  },

  cancelQueue: (queueItemId) => {
    console.log('[QueueStore] 取消排队', queueItemId);
    const item = get().queueItems.find(q => q.id === queueItemId);
    if (!item) return;

    set((state) => {
      const newQueueItems = state.queueItems.map(q =>
        q.id === queueItemId ? { ...q, status: 'cancelled' as QueueStatus } : q
      );
      const newCounters = state.counters.map(c =>
        c.id === item.counterId
          ? { ...c, waitingQueueCount: Math.max(0, c.waitingQueueCount - 1) }
          : c
      );
      saveToStorage(STORAGE_KEY_QUEUE_ITEMS, newQueueItems);
      saveToStorage(STORAGE_KEY_COUNTERS, newCounters);
      return {
        queueItems: newQueueItems,
        counters: newCounters
      };
    });
  },

  updateCounterStatus: (counterId, status) => set((state) => {
    const newCounters = state.counters.map(c =>
      c.id === counterId ? { ...c, status } : c
    );
    saveToStorage(STORAGE_KEY_COUNTERS, newCounters);
    return { counters: newCounters };
  }),

  getCountersLoad: () => getAllCountersLoad(get().counters, get().queueItems),

  triggerRebalance: () => {
    console.log('[QueueStore] 触发负载均衡重排');
    const reassignment = rebalanceQueues(get().counters, get().queueItems);

    if (reassignment.size > 0) {
      set((state) => {
        const newQueueItems = state.queueItems.map(q => {
          const newCounterId = reassignment.get(q.id);
          return newCounterId ? { ...q, counterId: newCounterId } : q;
        });

        const newCounters = state.counters.map(c => {
          const waitingCount = newQueueItems.filter(
            q => q.counterId === c.id && q.status === 'waiting'
          ).length;
          const servingCount = newQueueItems.filter(
            q => q.counterId === c.id && q.status === 'calling'
          ).length;
          return {
            ...c,
            waitingQueueCount: waitingCount,
            currentServingCount: servingCount
          };
        });

        saveToStorage(STORAGE_KEY_QUEUE_ITEMS, newQueueItems);
        saveToStorage(STORAGE_KEY_COUNTERS, newCounters);

        return {
          queueItems: newQueueItems,
          counters: newCounters
        };
      });
      console.log(`[QueueStore] 已重新分配 ${reassignment.size} 个排队项，窗口统计已更新`);
    }
  },

  transferToCounter: (queueItemId, targetCounterId) => {
    console.log('[QueueStore] 转窗口', { queueItemId, targetCounterId });
    const item = get().queueItems.find(q => q.id === queueItemId);
    if (!item) {
      console.error('[QueueStore] 排队项不存在', queueItemId);
      return false;
    }
    if (item.status !== 'waiting') {
      console.error('[QueueStore] 仅等待中状态可转窗口', item.status);
      return false;
    }
    const target = get().counters.find(c => c.id === targetCounterId);
    if (!target || target.status === 'offline') {
      console.error('[QueueStore] 目标窗口不可用', targetCounterId);
      return false;
    }
    const oldCounterId = item.counterId;

    set((state) => {
      const newQueueItems = state.queueItems.map(q =>
        q.id === queueItemId ? { ...q, counterId: targetCounterId } : q
      );
      const newCounters = state.counters.map(c => {
        let waitingCount = c.waitingQueueCount;
        if (c.id === oldCounterId) waitingCount = Math.max(0, waitingCount - 1);
        if (c.id === targetCounterId) waitingCount = waitingCount + 1;
        return { ...c, waitingQueueCount: waitingCount };
      });
      saveToStorage(STORAGE_KEY_QUEUE_ITEMS, newQueueItems);
      saveToStorage(STORAGE_KEY_COUNTERS, newCounters);
      return { queueItems: newQueueItems, counters: newCounters };
    });
    console.log('[QueueStore] 转窗口成功', { from: oldCounterId, to: targetCounterId });
    return true;
  },

  moveToFront: (queueItemId, options) => {
    const { targetCounterId, reason } = options || {};
    console.log('[QueueStore] 插队到队首', { queueItemId, targetCounterId, reason });
    const item = get().queueItems.find(q => q.id === queueItemId);
    if (!item) {
      console.error('[QueueStore] 排队项不存在', queueItemId);
      return false;
    }
    if (item.status !== 'waiting') {
      console.error('[QueueStore] 仅等待中状态可插队', item.status);
      return false;
    }

    let finalCounterId = item.counterId;
    if (targetCounterId) {
      const target = get().counters.find(c => c.id === targetCounterId);
      if (!target || target.status === 'offline') {
        console.error('[QueueStore] 目标窗口不可用', targetCounterId);
        return false;
      }
      finalCounterId = targetCounterId;
    }

    const oldCounterId = item.counterId;

    set((state) => {
      let newQueueItems = state.queueItems;

      const sameCounterWaiting = newQueueItems
        .filter(q => q.counterId === finalCounterId && q.status === 'waiting')
        .sort((a, b) => (b.priority || 0) - (a.priority || 0) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const maxPrio = sameCounterWaiting.length > 0 ? (sameCounterWaiting[0].priority || 0) : 0;

      newQueueItems = newQueueItems.map(q =>
        q.id === queueItemId
          ? { ...q, priority: maxPrio + 1000, isVip: true, counterId: finalCounterId, priorityReason: reason || 'VIP优先' }
          : q
      );

      let newCounters = state.counters;
      if (finalCounterId !== oldCounterId) {
        newCounters = newCounters.map(c => {
          let wc = c.waitingQueueCount;
          if (c.id === oldCounterId) wc = Math.max(0, wc - 1);
          if (c.id === finalCounterId) wc = wc + 1;
          return { ...c, waitingQueueCount: wc };
        });
      }
      saveToStorage(STORAGE_KEY_QUEUE_ITEMS, newQueueItems);
      saveToStorage(STORAGE_KEY_COUNTERS, newCounters);
      return { queueItems: newQueueItems, counters: newCounters };
    });
    console.log('[QueueStore] 插队成功', { from: oldCounterId, to: finalCounterId, reason });
    return true;
  },

  resetToMock: () => {
    saveToStorage(STORAGE_KEY_COUNTERS, mockCounters);
    saveToStorage(STORAGE_KEY_QUEUE_ITEMS, mockQueueItems);
    set({ counters: mockCounters, queueItems: mockQueueItems });
  }
}));
