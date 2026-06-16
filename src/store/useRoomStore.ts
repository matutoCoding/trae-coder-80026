import { create } from 'zustand';
import type { Room, RoomBookingSlot } from '../types/room';
import { mockRooms, mockRoomSchedules } from '../data/rooms';
import { saveToStorage, loadFromStorage } from '../utils/persist';
import { splitOvernightRange, isSlotOverlap, addDays } from '../utils/timeUtils';

interface RoomState {
  rooms: Room[];
  schedules: Record<string, RoomBookingSlot[]>;
  setRooms: (rooms: Room[]) => void;
  updateRoomStatus: (roomId: string, status: Room['status']) => void;
  addBookingToSchedule: (roomId: string, booking: Omit<RoomBookingSlot, 'date'> & { date: string }) => boolean;
  removeBookingFromSchedule: (roomId: string, bookingId: string) => void;
  getRoomById: (roomId: string) => Room | undefined;
  hasConflict: (roomId: string, date: string, startTime: string, endTime: string, excludeBookingId?: string) => boolean;
  resetToMock: () => void;
}

const STORAGE_KEY_ROOMS = 'rooms';
const STORAGE_KEY_SCHEDULES = 'schedules';

const initialRooms = loadFromStorage<Room[]>(STORAGE_KEY_ROOMS, mockRooms);
const initialSchedules = loadFromStorage<Record<string, RoomBookingSlot[]>>(STORAGE_KEY_SCHEDULES, mockRoomSchedules);

export const useRoomStore = create<RoomState>((set, get) => ({
  rooms: initialRooms,
  schedules: initialSchedules,

  setRooms: (rooms) => {
    saveToStorage(STORAGE_KEY_ROOMS, rooms);
    set({ rooms });
  },

  updateRoomStatus: (roomId, status) => set((state) => {
    const newRooms = state.rooms.map(r =>
      r.id === roomId ? { ...r, status } : r
    );
    saveToStorage(STORAGE_KEY_ROOMS, newRooms);
    return { rooms: newRooms };
  }),

  hasConflict: (roomId, date, startTime, endTime, excludeBookingId) => {
    const existing = get().schedules[roomId] || [];
    const newRanges = splitOvernightRange(date, startTime, endTime);
    for (const range of newRanges) {
      for (const slot of existing) {
        if (excludeBookingId && slot.bookingId === excludeBookingId) continue;
        if (isSlotOverlap(range, slot)) return true;
      }
    }
    return false;
  },

  addBookingToSchedule: (roomId, booking) => {
    const { date, startTime, endTime, bookingId, status } = booking;
    const existing = get().schedules[roomId] || [];

    const newRanges = splitOvernightRange(date, startTime, endTime);
    for (const range of newRanges) {
      for (const slot of existing) {
        if (slot.bookingId === bookingId) continue;
        if (isSlotOverlap(range, slot)) {
          console.error('[RoomStore] 时间段有冲突', { roomId, range, slot });
          return false;
        }
      }
    }

    const filtered = existing.filter(s => s.bookingId !== bookingId);
    const newSlots: RoomBookingSlot[] = newRanges.map(r => ({
      bookingId,
      date: r.date,
      startTime: r.startTime,
      endTime: r.endTime,
      status
    }));

    const newSchedules = {
      ...get().schedules,
      [roomId]: [...filtered, ...newSlots]
    };
    saveToStorage(STORAGE_KEY_SCHEDULES, newSchedules);
    set({ schedules: newSchedules });
    return true;
  },

  removeBookingFromSchedule: (roomId, bookingId) => set((state) => {
    const existing = state.schedules[roomId] || [];
    const newSchedules = {
      ...state.schedules,
      [roomId]: existing.filter(b => b.bookingId !== bookingId)
    };
    saveToStorage(STORAGE_KEY_SCHEDULES, newSchedules);
    return { schedules: newSchedules };
  }),

  getRoomById: (roomId) => get().rooms.find(r => r.id === roomId),

  resetToMock: () => {
    saveToStorage(STORAGE_KEY_ROOMS, mockRooms);
    saveToStorage(STORAGE_KEY_SCHEDULES, mockRoomSchedules);
    set({ rooms: mockRooms, schedules: mockRoomSchedules });
  }
}));
