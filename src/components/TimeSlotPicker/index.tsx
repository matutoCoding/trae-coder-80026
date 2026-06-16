import React, { useMemo } from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import { getTimeSlots, isTimeOverlap } from '../../utils/timeUtils';
import type { RoomBookingSlot } from '../../types/room';
import styles from './index.module.scss';

interface TimeSlotPickerProps {
  selectedTime: string;
  onTimeChange: (time: string) => void;
  selectedDuration: number;
  onDurationChange: (duration: number) => void;
  bookings?: RoomBookingSlot[];
  date?: string;
}

const DURATION_OPTIONS = [
  { hours: 1, label: '1小时' },
  { hours: 2, label: '2小时' },
  { hours: 3, label: '3小时' },
  { hours: 4, label: '4小时' }
];

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  selectedTime,
  onTimeChange,
  selectedDuration,
  onDurationChange,
  bookings = []
}) => {
  const timeSlots = useMemo(() => getTimeSlots(12, 24, 60), []);

  const isSlotDisabled = (time: string): boolean => {
    const endTime = (() => {
      const [h, m] = time.split(':').map(Number);
      const totalMin = h * 60 + m + selectedDuration * 60;
      return `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
    })();

    return bookings.some(booking =>
      isTimeOverlap(time, endTime, booking.startTime, booking.endTime)
    );
  };

  return (
    <View className={styles.container}>
      <View className={styles.label}>选择开始时间</View>
      <View className={styles.slots}>
        {timeSlots.map(time => {
          const disabled = isSlotDisabled(time);
          return (
            <View
              key={time}
              className={classnames(styles.slot, {
                [styles.slotSelected]: selectedTime === time,
                [styles.slotDisabled]: disabled
              })}
              onClick={() => !disabled && onTimeChange(time)}
            >
              <View className={styles.slotTime}>{time}</View>
              <View className={styles.slotStatus}>
                {disabled ? '已占用' : '可预订'}
              </View>
            </View>
          );
        })}
      </View>

      <View className={styles.durationSection}>
        <View className={styles.durationLabel}>选择时长</View>
        <View className={styles.durationOptions}>
          {DURATION_OPTIONS.map(option => (
            <View
              key={option.hours}
              className={classnames(styles.durationOption, {
                [styles.durationOptionSelected]: selectedDuration === option.hours
              })}
              onClick={() => onDurationChange(option.hours)}
            >
              <View className={styles.durationOptionHours}>{option.hours}h</View>
              <View className={styles.durationOptionLabel}>{option.label}</View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

export default TimeSlotPicker;
