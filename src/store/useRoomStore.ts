import { create } from 'zustand';
import type { Room, RoomBookingSlot } from '../types/room';
import { mockRooms, mockRoomSchedules } from '../data/rooms';
import { saveToStorage, loadFromStorage } from '../utils/persist';

interface RoomState {
  rooms: Room[];
  schedules: Record<string, RoomBookingSlot[]>;
  setRooms: (rooms: Room[]) => void;
  updateRoomStatus: (roomId: string, status: Room['status']) => void;
  addBookingToSchedule: (roomId: string, booking: RoomBookingSlot) => void;
  removeBookingFromSchedule: (roomId: string, bookingId: string) => void;
  getRoomById: (roomId: string) => Room | undefined;
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

  addBookingToSchedule: (roomId, booking) => set((state) => {
    const existing = state.schedules[roomId] || [];
    const newSchedules = {
      ...state.schedules,
      [roomId]: [...existing, booking]
    };
    saveToStorage(STORAGE_KEY_SCHEDULES, newSchedules);
    return { schedules: newSchedules };
  }),

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
