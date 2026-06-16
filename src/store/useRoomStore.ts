import { create } from 'zustand';
import type { Room, RoomBookingSlot } from '../types/room';
import { mockRooms, mockRoomSchedules } from '../data/rooms';

interface RoomState {
  rooms: Room[];
  schedules: Record<string, RoomBookingSlot[]>;
  setRooms: (rooms: Room[]) => void;
  updateRoomStatus: (roomId: string, status: Room['status']) => void;
  addBookingToSchedule: (roomId: string, booking: RoomBookingSlot) => void;
  removeBookingFromSchedule: (roomId: string, bookingId: string) => void;
  getRoomById: (roomId: string) => Room | undefined;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  rooms: mockRooms,
  schedules: mockRoomSchedules,

  setRooms: (rooms) => set({ rooms }),

  updateRoomStatus: (roomId, status) => set((state) => ({
    rooms: state.rooms.map(r =>
      r.id === roomId ? { ...r, status } : r
    )
  })),

  addBookingToSchedule: (roomId, booking) => set((state) => {
    const existing = state.schedules[roomId] || [];
    return {
      schedules: {
        ...state.schedules,
        [roomId]: [...existing, booking]
      }
    };
  }),

  removeBookingFromSchedule: (roomId, bookingId) => set((state) => {
    const existing = state.schedules[roomId] || [];
    return {
      schedules: {
        ...state.schedules,
        [roomId]: existing.filter(b => b.bookingId !== bookingId)
      }
    };
  }),

  getRoomById: (roomId) => get().rooms.find(r => r.id === roomId)
}));
