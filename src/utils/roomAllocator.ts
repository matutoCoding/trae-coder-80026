import type { Room, RoomType, RoomBookingSlot } from '../types/room';
import { isTimeOverlap } from './timeUtils';

interface AllocationCandidate {
  room: Room;
  score: number;
  fragmentRisk: number;
}

export interface AllocationResult {
  success: boolean;
  room?: Room;
  reason?: string;
}

const getRoomTypeByPeople = (peopleCount: number): RoomType => {
  if (peopleCount <= 4) return 'small';
  if (peopleCount <= 8) return 'medium';
  if (peopleCount <= 15) return 'large';
  if (peopleCount <= 25) return 'vip';
  return 'luxury';
};

const getRoomTypePriority = (type: RoomType): number => {
  const priority: Record<RoomType, number> = {
    small: 1,
    medium: 2,
    large: 3,
    vip: 4,
    luxury: 5
  };
  return priority[type];
};

const calculateFragmentRisk = (
  existingBookings: RoomBookingSlot[],
  startTime: string,
  endTime: string
): number => {
  if (existingBookings.length === 0) return 0;

  let risk = 0;
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const sMin = toMin(startTime);
  const eMin = toMin(endTime);

  for (const booking of existingBookings) {
    const bsMin = toMin(booking.startTime);
    const beMin = toMin(booking.endTime);

    const gapBefore = sMin - beMin;
    const gapAfter = bsMin - eMin;

    if (gapBefore > 0 && gapBefore < 60) risk += (60 - gapBefore);
    if (gapAfter > 0 && gapAfter < 60) risk += (60 - gapAfter);
  }

  return risk;
};

const calculateFitScore = (
  room: Room,
  peopleCount: number,
  preferredType?: RoomType
): number => {
  let score = 0;
  const idealType = getRoomTypeByPeople(peopleCount);
  const roomTypeLevel = getRoomTypePriority(room.type);
  const idealTypeLevel = getRoomTypePriority(idealType);

  if (room.capacity < peopleCount) return -1;

  const capacityDiff = room.capacity - peopleCount;
  score += Math.max(0, 50 - capacityDiff * 5);

  const typeDiff = roomTypeLevel - idealTypeLevel;
  if (typeDiff === 0) score += 50;
  else if (typeDiff === 1) score += 30;
  else if (typeDiff === 2) score += 10;
  else score -= 20;

  if (preferredType && room.type === preferredType) score += 30;

  return score;
};

export const findBestRoom = (
  rooms: Room[],
  schedules: Record<string, RoomBookingSlot[]>,
  peopleCount: number,
  date: string,
  startTime: string,
  endTime: string,
  preferredType?: RoomType
): AllocationResult => {
  console.log('[RoomAllocator] 开始分配包厢', {
    peopleCount,
    date,
    startTime,
    endTime,
    preferredType
  });

  const availableRooms = rooms.filter(room => {
    if (room.status === 'maintenance') return false;
    if (room.capacity < peopleCount) return false;

    const roomBookings = schedules[room.id] || [];
    const hasConflict = roomBookings.some(booking =>
      isTimeOverlap(startTime, endTime, booking.startTime, booking.endTime)
    );

    return !hasConflict;
  });

  if (availableRooms.length === 0) {
    console.log('[RoomAllocator] 无可用包厢');
    return {
      success: false,
      reason: '当前时间段暂无可用包厢，请选择其他时间或房型'
    };
  }

  const candidates: AllocationCandidate[] = availableRooms.map(room => {
    const roomBookings = schedules[room.id] || [];
    const fitScore = calculateFitScore(room, peopleCount, preferredType);
    const fragmentRisk = calculateFragmentRisk(roomBookings, startTime, endTime);
    const finalScore = fitScore - fragmentRisk * 0.5 + (room.status === 'available' ? 10 : 0);

    return {
      room,
      score: finalScore,
      fragmentRisk
    };
  });

  candidates.sort((a, b) => b.score - a.score);

  console.log('[RoomAllocator] 分配结果', {
    bestRoom: candidates[0]?.room.name,
    score: candidates[0]?.score,
    totalCandidates: candidates.length
  });

  return {
    success: true,
    room: candidates[0].room
  };
};

export const getRoomRecommendations = (
  rooms: Room[],
  schedules: Record<string, RoomBookingSlot[]>,
  date: string,
  peopleCount: number
): Room[] => {
  const idealType = getRoomTypeByPeople(peopleCount);
  return rooms
    .filter(r => r.capacity >= peopleCount && r.status !== 'maintenance')
    .sort((a, b) => {
      const aDiff = Math.abs(getRoomTypePriority(a.type) - getRoomTypePriority(idealType));
      const bDiff = Math.abs(getRoomTypePriority(b.type) - getRoomTypePriority(idealType));
      return aDiff - bDiff;
    })
    .slice(0, 5);
};
