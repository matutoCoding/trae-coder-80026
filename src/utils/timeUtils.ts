import dayjs from 'dayjs';

export const formatTime = (date: Date | string, format: string = 'HH:mm'): string => {
  return dayjs(date).format(format);
};

export const formatDate = (date: Date | string, format: string = 'YYYY-MM-DD'): string => {
  return dayjs(date).format(format);
};

export const formatDateTime = (date: Date | string, format: string = 'YYYY-MM-DD HH:mm'): string => {
  return dayjs(date).format(format);
};

export const getToday = (): string => {
  return dayjs().format('YYYY-MM-DD');
};

export const addDays = (date: string | number, days?: number): string => {
  if (typeof date === 'number') {
    return dayjs().add(date, 'day').format('YYYY-MM-DD');
  }
  return dayjs(date).add(days || 0, 'day').format('YYYY-MM-DD');
};

export const getTimeSlots = (startHour: number = 12, endHour: number = 24, stepMinutes: number = 60): string[] => {
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
};

export const addHours = (time: string, hours: number): string => {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + hours * 60;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
};

export const isOvernight = (startTime: string, endTime: string): boolean => {
  const [sh] = startTime.split(':').map(Number);
  const [eh] = endTime.split(':').map(Number);
  return eh < sh || (eh === sh && endTime <= startTime);
};

export const toMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const toMinutesNormalized = (startTime: string, endTime: string): { sMin: number; eMin: number } => {
  let sMin = toMinutes(startTime);
  let eMin = toMinutes(endTime);
  if (isOvernight(startTime, endTime)) {
    eMin += 24 * 60;
  }
  return { sMin, eMin };
};

export const calculateMinutesDiff = (startTime: string, endTime: string): number => {
  const { sMin, eMin } = toMinutesNormalized(startTime, endTime);
  return eMin - sMin;
};

export const isTimeOverlap = (
  start1: string, end1: string,
  start2: string, end2: string
): boolean => {
  const { sMin: s1, eMin: e1 } = toMinutesNormalized(start1, end1);
  const { sMin: s2, eMin: e2 } = toMinutesNormalized(start2, end2);
  return s1 < e2 && s2 < e1;
};

export interface SplitTimeRange {
  date: string;
  startTime: string;
  endTime: string;
}

export const splitOvernightRange = (
  startDate: string,
  startTime: string,
  endTime: string
): SplitTimeRange[] => {
  if (!isOvernight(startTime, endTime)) {
    return [{ date: startDate, startTime, endTime }];
  }
  return [
    { date: startDate, startTime, endTime: '24:00' },
    { date: addDays(startDate, 1), startTime: '00:00', endTime }
  ];
};

export interface SlotWithDate {
  date: string;
  startTime: string;
  endTime: string;
}

export const isSlotOverlap = (a: SlotWithDate, b: SlotWithDate): boolean => {
  if (a.date !== b.date) return false;
  return isTimeOverlap(a.startTime, a.endTime, b.startTime, b.endTime);
};

export interface ScheduleSegmentForConflict {
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  bookingId?: string;
}

export const hasConflict = (
  schedules: ScheduleSegmentForConflict[],
  roomId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): boolean => {
  const querySegments: SlotWithDate[] = splitOvernightRange(date, startTime, endTime);
  for (const seg of schedules) {
    if (seg.roomId !== roomId) continue;
    if (excludeBookingId && seg.bookingId === excludeBookingId) continue;
    for (const q of querySegments) {
      if (isSlotOverlap(q, { date: seg.date, startTime: seg.startTime, endTime: seg.endTime })) {
        return true;
      }
    }
  }
  return false;
};

export const generateOrderNo = (): string => {
  const now = dayjs();
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `KTV${now.format('YYYYMMDDHHmmss')}${rand}`;
};

export const generateQueueNo = (roomType: string, seq: number): string => {
  const prefixMap: Record<string, string> = {
    small: 'S',
    medium: 'M',
    large: 'L',
    vip: 'V',
    luxury: 'X'
  };
  return `${prefixMap[roomType] || 'A'}${String(seq).padStart(3, '0')}`;
};
