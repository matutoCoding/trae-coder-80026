import { create } from 'zustand';
import type { Booking, BookingCreateRequest } from '../types/booking';
import type { Room } from '../types/room';
import type { SelectedPackage } from '../types/package';
import { mockBookings } from '../data/bookings';
import { mockPackages } from '../data/packages';
import { findBestRoom } from '../utils/roomAllocator';
import { findLeastLoadedCounter } from '../utils/loadBalancer';
import { generateOrderNo, addHours, getToday, generateQueueNo, addDays } from '../utils/timeUtils';
import { saveToStorage, loadFromStorage } from '../utils/persist';
import { useRoomStore } from './useRoomStore';
import { useQueueStore } from './useQueueStore';

const STORAGE_KEY_BOOKINGS = 'bookings';
const STORAGE_KEY_SELECTED_PACKAGES = 'selectedPackages';

export interface BookingModifyRequest {
  peopleCount?: number;
  date?: string;
  startTime?: string;
  duration?: number;
  packageIds?: string[];
}

interface BookingState {
  bookings: Booking[];
  selectedPackages: SelectedPackage[];
  setBookings: (bookings: Booking[]) => void;
  addBooking: (booking: Booking) => void;
  updateBooking: (bookingId: string, updates: Partial<Booking>) => void;
  getBookingById: (bookingId: string) => Booking | undefined;
  addPackage: (packageId: string) => void;
  removePackage: (packageId: string) => void;
  updatePackageQuantity: (packageId: string, quantity: number) => void;
  clearSelectedPackages: () => void;
  calculatePackageTotal: () => number;
  createBooking: (request: BookingCreateRequest) => Promise<{ success: boolean; booking?: Booking; error?: string }>;
  extendBooking: (bookingId: string, extendHours: number) => Promise<boolean>;
  modifyBooking: (bookingId: string, request: BookingModifyRequest) => Promise<{ success: boolean; booking?: Booking; error?: string }>;
  cancelBooking: (bookingId: string) => boolean;
  checkInBooking: (bookingId: string) => boolean;
  checkOutBooking: (bookingId: string) => boolean;
  resetToMock: () => void;
}

const initialBookings = loadFromStorage<Booking[]>(STORAGE_KEY_BOOKINGS, mockBookings);
const initialSelectedPackages = loadFromStorage<SelectedPackage[]>(STORAGE_KEY_SELECTED_PACKAGES, []);

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: initialBookings,
  selectedPackages: initialSelectedPackages,

  setBookings: (bookings) => {
    saveToStorage(STORAGE_KEY_BOOKINGS, bookings);
    set({ bookings });
  },

  addBooking: (booking) => set((state) => {
    const newBookings = [booking, ...state.bookings];
    saveToStorage(STORAGE_KEY_BOOKINGS, newBookings);
    return { bookings: newBookings };
  }),

  updateBooking: (bookingId, updates) => set((state) => {
    const newBookings = state.bookings.map(b =>
      b.id === bookingId ? { ...b, ...updates } : b
    );
    saveToStorage(STORAGE_KEY_BOOKINGS, newBookings);
    return { bookings: newBookings };
  }),

  getBookingById: (bookingId) => get().bookings.find(b => b.id === bookingId),

  addPackage: (packageId) => set((state) => {
    const existing = state.selectedPackages.find(p => p.packageId === packageId);
    let newPackages;
    if (existing) {
      newPackages = state.selectedPackages.map(p =>
        p.packageId === packageId ? { ...p, quantity: p.quantity + 1 } : p
      );
    } else {
      newPackages = [...state.selectedPackages, { packageId, quantity: 1 }];
    }
    saveToStorage(STORAGE_KEY_SELECTED_PACKAGES, newPackages);
    return { selectedPackages: newPackages };
  }),

  removePackage: (packageId) => set((state) => {
    const newPackages = state.selectedPackages.filter(p => p.packageId !== packageId);
    saveToStorage(STORAGE_KEY_SELECTED_PACKAGES, newPackages);
    return { selectedPackages: newPackages };
  }),

  updatePackageQuantity: (packageId, quantity) => set((state) => {
    let newPackages;
    if (quantity <= 0) {
      newPackages = state.selectedPackages.filter(p => p.packageId !== packageId);
    } else {
      newPackages = state.selectedPackages.map(p =>
        p.packageId === packageId ? { ...p, quantity } : p
      );
    }
    saveToStorage(STORAGE_KEY_SELECTED_PACKAGES, newPackages);
    return { selectedPackages: newPackages };
  }),

  clearSelectedPackages: () => {
    saveToStorage(STORAGE_KEY_SELECTED_PACKAGES, []);
    set({ selectedPackages: [] });
  },

  calculatePackageTotal: () => {
    const { selectedPackages } = get();
    return selectedPackages.reduce((total, sp) => {
      const pkg = mockPackages.find(p => p.id === sp.packageId);
      return total + (pkg?.discountPrice || 0) * sp.quantity;
    }, 0);
  },

  createBooking: async (request) => {
    console.log('[BookingStore] 创建预订', request);

    try {
      const { rooms, schedules } = useRoomStore.getState();

      const startHour = parseInt(request.startTime.split(':')[0], 10);
      let effectiveDate = request.date;
      if (startHour < 12) {
        effectiveDate = addDays(request.date, 1);
        console.log('[BookingStore] 凌晨时段自动跳次日', { from: request.date, to: effectiveDate, startTime: request.startTime });
      }

      const endTime = addHours(request.startTime, request.duration);

      const allocation = findBestRoom(
        rooms,
        schedules,
        request.peopleCount,
        effectiveDate,
        request.startTime,
        endTime,
        request.preferredRoomType
      );

      if (!allocation.success || !allocation.room) {
        return { success: false, error: allocation.reason };
      }

      const room = allocation.room as Room;

      const { counters, queueItems } = useQueueStore.getState();
      const counterAssignment = findLeastLoadedCounter(counters, queueItems);

      const queueSeq = queueItems.filter(q => q.roomType === room.type).length + 1;

      const packageAmount = request.packageIds.reduce((total, pid) => {
        const pkg = mockPackages.find(p => p.id === pid);
        return total + (pkg?.discountPrice || 0);
      }, 0);

      const baseAmount = room.hourlyRate * request.duration;
      const totalAmount = baseAmount + packageAmount;

      const booking: Booking = {
        id: `bk-${Date.now()}`,
        orderNo: generateOrderNo(),
        roomId: room.id,
        roomName: room.name,
        roomNo: room.roomNo,
        roomType: room.type,
        customerName: request.customerName,
        customerPhone: request.customerPhone,
        peopleCount: request.peopleCount,
        date: effectiveDate,
        startTime: request.startTime,
        endTime,
        originalEndTime: endTime,
        duration: request.duration,
        status: 'confirmed',
        baseAmount,
        packageAmount,
        extendAmount: 0,
        totalAmount,
        paidAmount: 0,
        packageIds: request.packageIds,
        createdAt: new Date().toISOString(),
        queueNo: generateQueueNo(room.type, queueSeq),
        counterId: counterAssignment?.counterId
      };

      const scheduleOk = useRoomStore.getState().addBookingToSchedule(room.id, {
        bookingId: booking.id,
        date: effectiveDate,
        startTime: request.startTime,
        endTime,
        status: 'reserved'
      });
      if (!scheduleOk) {
        return { success: false, error: '包厢排期冲突，请更换时间' };
      }

      get().addBooking(booking);

      const queueItem = useQueueStore.getState().addToQueue({
        roomType: room.type,
        peopleCount: request.peopleCount,
        customerName: request.customerName,
        customerPhone: request.customerPhone
      });

      if (queueItem) {
        useQueueStore.getState().updateBookingId(queueItem.id, booking.id);
        get().updateBooking(booking.id, {
          queueNo: queueItem.queueNo,
          counterId: queueItem.counterId,
          queueItemId: queueItem.id
        });
      }

      console.log('[BookingStore] 预订创建成功', booking, queueItem);
      return { success: true, booking };
    } catch (error) {
      console.error('[BookingStore] 创建预订失败', error);
      return { success: false, error: '系统错误，请稍后重试' };
    }
  },

  extendBooking: async (bookingId, extendHours) => {
    console.log('[BookingStore] 续钟', { bookingId, extendHours });

    const booking = get().getBookingById(bookingId);
    if (!booking) {
      console.error('[BookingStore] 预订不存在', bookingId);
      return false;
    }

    if (booking.status !== 'checked_in' && booking.status !== 'confirmed' && booking.status !== 'extended') {
      console.error('[BookingStore] 当前状态不支持续钟', booking.status);
      return false;
    }

    try {
      const roomStore = useRoomStore.getState();
      const room = roomStore.getRoomById(booking.roomId);
      if (!room) return false;

      const newEndTime = addHours(booking.endTime, extendHours);

      const hasConflict = roomStore.hasConflict(
        booking.roomId,
        booking.date,
        booking.endTime,
        newEndTime,
        bookingId
      );

      if (hasConflict) {
        console.error('[BookingStore] 续钟时间段有冲突');
        return false;
      }

      const extendAmount = room.hourlyRate * extendHours;

      const scheduleOk = roomStore.addBookingToSchedule(booking.roomId, {
        bookingId,
        date: booking.date,
        startTime: booking.endTime,
        endTime: newEndTime,
        status: booking.status === 'checked_in' ? 'occupied' : 'reserved'
      });
      if (!scheduleOk) {
        console.error('[BookingStore] 续钟更新排期失败');
        return false;
      }

      get().updateBooking(bookingId, {
        endTime: newEndTime,
        duration: booking.duration + extendHours,
        extendAmount: booking.extendAmount + extendAmount,
        totalAmount: booking.totalAmount + extendAmount,
        status: 'extended'
      });

      console.log('[BookingStore] 续钟成功');
      return true;
    } catch (error) {
      console.error('[BookingStore] 续钟失败', error);
      return false;
    }
  },

  modifyBooking: async (bookingId, request) => {
    console.log('[BookingStore] 修改预订', { bookingId, request });

    const booking = get().getBookingById(bookingId);
    if (!booking) {
      return { success: false, error: '预订不存在' };
    }

    if (booking.status === 'completed' || booking.status === 'checked_in') {
      return { success: false, error: '当前状态不支持修改' };
    }

    try {
      const roomStore = useRoomStore.getState();
      const newPeopleCount = request.peopleCount ?? booking.peopleCount;
      let newDate = request.date ?? booking.date;
      const newStartTime = request.startTime ?? booking.startTime;
      const newDuration = request.duration ?? booking.duration;
      const newPackageIds = request.packageIds ?? booking.packageIds;
      const newEndTime = addHours(newStartTime, newDuration);

      const startHour = parseInt(newStartTime.split(':')[0], 10);
      if (startHour < 12) {
        newDate = addDays(request.date ?? booking.date, 1);
        console.log('[BookingStore] 修改预订-凌晨时段自动跳次日', { from: request.date ?? booking.date, to: newDate, startTime: newStartTime });
      }

      let roomId = booking.roomId;
      let room = roomStore.getRoomById(roomId);
      if (!room) return { success: false, error: '包厢不存在' };

      const needsRoomReallocation =
        request.peopleCount !== undefined ||
        request.date !== undefined ||
        request.startTime !== undefined ||
        request.duration !== undefined;

      const oldRoomId = booking.roomId;
      const oldDate = booking.date;
      const oldStartTime = booking.startTime;
      const oldEndTime = booking.endTime;
      const oldStatus = booking.status === 'checked_in' || booking.status === 'extended' ? 'occupied' : 'reserved';

      if (needsRoomReallocation) {
        const { rooms, schedules } = roomStore;
        const allocation = findBestRoom(
          rooms,
          schedules,
          newPeopleCount,
          newDate,
          newStartTime,
          newEndTime,
          booking.roomType,
          bookingId
        );

        if (!allocation.success || !allocation.room) {
          console.error('[BookingStore] 修改预订-新时段无可用包厢，旧排期保留');
          return { success: false, error: allocation.reason || '没有可用包厢，旧预订已保留' };
        }
        room = allocation.room as Room;
        roomId = room.id;
      } else {
        const hasConflict = roomStore.hasConflict(roomId, newDate, newStartTime, newEndTime, bookingId);
        if (hasConflict) {
          console.error('[BookingStore] 修改预订-新时段冲突，旧排期保留');
          return { success: false, error: '新包厢时段冲突，请更换时间' };
        }
      }

      if (roomId !== oldRoomId) {
        roomStore.removeBookingFromSchedule(oldRoomId, bookingId);
      } else {
        if (needsRoomReallocation) {
          roomStore.removeBookingFromSchedule(oldRoomId, bookingId);
        }
      }

      const scheduleOk = roomStore.addBookingToSchedule(roomId, {
        bookingId,
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
        status: booking.status === 'checked_in' || booking.status === 'extended' ? 'occupied' : 'reserved'
      });

      if (!scheduleOk) {
        console.error('[BookingStore] 修改预订-写新排期失败，回滚旧排期');
        if (roomId !== oldRoomId || needsRoomReallocation) {
          roomStore.addBookingToSchedule(oldRoomId, {
            bookingId,
            date: oldDate,
            startTime: oldStartTime,
            endTime: oldEndTime,
            status: oldStatus
          });
        }
        return { success: false, error: '包厢排期冲突，请更换时间，旧预订已保留' };
      }

      const packageAmount = newPackageIds.reduce((total, pid) => {
        const pkg = mockPackages.find(p => p.id === pid);
        return total + (pkg?.discountPrice || 0);
      }, 0);

      const baseAmount = room.hourlyRate * newDuration;
      const extendAmount = booking.extendAmount;
      const totalAmount = baseAmount + packageAmount + extendAmount;

      get().updateBooking(bookingId, {
        roomId,
        roomName: room.name,
        roomNo: room.roomNo,
        roomType: room.type,
        peopleCount: newPeopleCount,
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
        duration: newDuration,
        packageIds: newPackageIds,
        packageAmount,
        baseAmount,
        totalAmount
      });

      const updated = get().getBookingById(bookingId);
      console.log('[BookingStore] 修改成功', updated);
      return { success: true, booking: updated };
    } catch (error) {
      console.error('[BookingStore] 修改预订失败', error);
      return { success: false, error: '系统错误，请稍后重试' };
    }
  },

  cancelBooking: (bookingId) => {
    console.log('[BookingStore] 取消预订', bookingId);
    const booking = get().getBookingById(bookingId);
    if (!booking) return false;

    if (booking.status === 'completed' || booking.status === 'checked_in') {
      return false;
    }

    useRoomStore.getState().removeBookingFromSchedule(booking.roomId, bookingId);

    if (booking.queueItemId) {
      useQueueStore.getState().cancelQueue(booking.queueItemId);
    } else {
      const matchingQueue = useQueueStore.getState().queueItems.find(
        q => q.bookingId === bookingId || (
          q.customerPhone === booking.customerPhone &&
          q.customerName === booking.customerName &&
          (q.status === 'waiting' || q.status === 'calling')
        )
      );
      if (matchingQueue) {
        useQueueStore.getState().cancelQueue(matchingQueue.id);
      }
    }

    get().updateBooking(bookingId, { status: 'cancelled' });
    return true;
  },

  checkInBooking: (bookingId) => {
    console.log('[BookingStore] 客人入场', bookingId);
    const booking = get().getBookingById(bookingId);
    if (!booking || booking.status !== 'confirmed') return false;

    useRoomStore.getState().updateRoomStatus(booking.roomId, 'occupied');
    get().updateBooking(bookingId, {
      status: 'checked_in',
      checkInTime: new Date().toISOString()
    });
    return true;
  },

  checkOutBooking: (bookingId) => {
    console.log('[BookingStore] 客人离场', bookingId);
    const booking = get().getBookingById(bookingId);
    if (!booking || (booking.status !== 'checked_in' && booking.status !== 'extended')) return false;

    useRoomStore.getState().updateRoomStatus(booking.roomId, 'available');
    get().updateBooking(bookingId, {
      status: 'completed',
      checkOutTime: new Date().toISOString()
    });
    return true;
  },

  resetToMock: () => {
    saveToStorage(STORAGE_KEY_BOOKINGS, mockBookings);
    saveToStorage(STORAGE_KEY_SELECTED_PACKAGES, []);
    set({ bookings: mockBookings, selectedPackages: [] });
  }
}));
