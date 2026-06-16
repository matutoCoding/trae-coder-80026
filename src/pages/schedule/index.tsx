import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useRoomStore } from '../../store/useRoomStore';
import { useBookingStore } from '../../store/useBookingStore';
import type { RoomType, RoomStatus } from '../../types/room';
import { ROOM_TYPE_LABEL, ROOM_STATUS_LABEL } from '../../types/room';
import { getTimeSlots, getToday, addDays, calculateMinutesDiff } from '../../utils/timeUtils';
import styles from './index.module.scss';

const ALL_TYPES: (RoomType | 'all')[] = ['all', 'small', 'medium', 'large', 'vip', 'luxury'];
const TIME_SLOTS = getTimeSlots(12, 26, 2);
const START_HOUR = 12;
const END_HOUR = 26;

type DateViewMode = 'today' | 'tomorrow' | 'week';

const SCHEDULE_STYLES = `
.date-tabs {
  display: flex;
  gap: 16rpx;
  padding: 16rpx 32rpx;
  background: rgba(255,255,255,0.04);
  border-bottom: 2rpx solid rgba(255,255,255,0.06);
  overflow-x: auto;
  white-space: nowrap;
}
.date-tab {
  padding: 16rpx 32rpx;
  border-radius: 40rpx;
  color: #6E6E91;
  font-size: 26rpx;
  background: rgba(123,47,253,0.08);
  border: 2rpx solid transparent;
  flex-shrink: 0;
}
.date-tab-active {
  color: #fff;
  background: linear-gradient(135deg, #7B2FFD 0%, #FF3D8A 100%);
  border-color: #FFD700;
  font-weight: 600;
}
.week-tabs {
  margin-top: 16rpx;
  display: flex;
  gap: 12rpx;
  overflow-x: auto;
  padding: 8rpx 0;
  white-space: nowrap;
}
.week-tab {
  padding: 12rpx 24rpx;
  border-radius: 24rpx;
  background: rgba(255,255,255,0.04);
  color: #6E6E91;
  font-size: 24rpx;
  flex-shrink: 0;
}
.week-tab-active {
  background: rgba(123,47,253,0.25);
  color: #fff;
  border: 2rpx solid rgba(123,47,253,0.6);
}
.block-overnight {
  background: repeating-linear-gradient(
    135deg,
    rgba(255,61,138,0.25),
    rgba(255,61,138,0.25) 10rpx,
    rgba(255,61,138,0.08) 10rpx,
    rgba(255,61,138,0.08) 20rpx
  ) !important;
  border: 2rpx dashed #FFD700 !important;
  color: #FFD700 !important;
}
.block-label {
  font-size: 20rpx;
  line-height: 1.3;
}
.block-selected {
  border: 4rpx solid #FFD700 !important;
  box-shadow: 0 0 24rpx rgba(255, 215, 0, 0.7) !important;
  z-index: 10;
}
.selected-banner {
  margin: 16rpx 32rpx 0;
  padding: 24rpx 28rpx;
  background: linear-gradient(135deg, rgba(123,47,253,0.25) 0%, rgba(255,61,138,0.25) 100%);
  border: 2rpx solid #FFD700;
  border-radius: 16rpx;
}
.selected-banner-title {
  font-size: 28rpx;
  color: #FFD700;
  font-weight: 700;
  margin-bottom: 8rpx;
}
.selected-banner-time {
  font-size: 30rpx;
  color: #fff;
  font-weight: 600;
}
.selected-banner-duration {
  font-size: 24rpx;
  color: #8E8EB2;
  margin-top: 6rpx;
}
.selected-banner-close {
  float: right;
  color: #6E6E91;
  font-size: 28rpx;
  padding: 0 12rpx;
}
`;

const SchedulePage: React.FC = () => {
  const { rooms, schedules } = useRoomStore();
  const { getBookingById } = useBookingStore();
  const [selectedType, setSelectedType] = useState<RoomType | 'all'>('all');
  const [dateMode, setDateMode] = useState<DateViewMode>('today');
  const [weekIndex, setWeekIndex] = useState(0);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const selectedBookingInfo = useMemo(() => {
    if (!selectedBookingId) return null;
    const booking = getBookingById(selectedBookingId);
    const allSlots: { date: string; startTime: string; endTime: string; roomId: string; roomName: string }[] = [];
    let roomId = '';
    for (const rId of Object.keys(schedules)) {
      for (const slot of schedules[rId] || []) {
        if (slot.bookingId === selectedBookingId) {
          const room = rooms.find(r => r.id === rId);
          allSlots.push({ date: slot.date || '-', startTime: slot.startTime, endTime: slot.endTime, roomId: rId, roomName: room?.name || '' });
          roomId = rId;
        }
      }
    }
    if (allSlots.length === 0) return null;
    allSlots.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    const first = allSlots[0];
    const last = allSlots[allSlots.length - 1];
    let totalMin = 0;
    for (const s of allSlots) totalMin += calculateMinutesDiff(s.startTime, s.endTime);
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    return {
      bookingId: selectedBookingId,
      customerName: booking?.customerName,
      roomId,
      roomName: first.roomName,
      segments: allSlots,
      startDate: first.date,
      startTime: first.startTime,
      endDate: last.date,
      endTime: last.endTime,
      totalHours: hours,
      totalMins: mins,
      totalMinutes: totalMin
    };
  }, [selectedBookingId, schedules, rooms, getBookingById]);

  const TODAY = getToday();
  const TOMORROW = addDays(TODAY, 1);
  const weekDates = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i < 7; i++) arr.push(addDays(TODAY, i));
    return arr;
  }, [TODAY]);

  const activeDate = useMemo(() => {
    if (dateMode === 'today') return TODAY;
    if (dateMode === 'tomorrow') return TOMORROW;
    return weekDates[weekIndex];
  }, [dateMode, weekIndex, TODAY, TOMORROW, weekDates]);

  const displayDayLabel = (d: string): string => {
    if (d === TODAY) return '今天';
    if (d === TOMORROW) return '明天';
    const diff = Math.round((new Date(d).getTime() - new Date(TODAY).getTime()) / 86400000);
    return `${diff}天后`;
  };

  const stats = useMemo(() => {
    return {
      total: rooms.length,
      available: rooms.filter(r => r.status === 'available').length,
      occupied: rooms.filter(r => r.status === 'occupied').length,
      reserved: rooms.filter(r => r.status === 'reserved').length
    };
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    if (selectedType === 'all') return rooms;
    return rooms.filter(r => r.type === selectedType);
  }, [rooms, selectedType]);

  const timeToPercent = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    const totalMinutes = (h - START_HOUR) * 60 + m;
    const totalRange = (END_HOUR - START_HOUR) * 60;
    return Math.max(0, Math.min(100, (totalMinutes / totalRange) * 100));
  };

  const getStatusClass = (status: RoomStatus) => ({
    available: styles.statusAvailable,
    occupied: styles.statusOccupied,
    reserved: styles.statusReserved,
    maintenance: styles.statusMaintenance
  }[status]);

  const getValueClass = (key: string) => ({
    available: styles.valueAvailable,
    occupied: styles.valueOccupied,
    reserved: styles.valueReserved,
    total: styles.valueTotal
  }[key]);

  const goToRoomDetail = (roomId: string) => {
    Taro.navigateTo({ url: `/pages/room-detail/index?id=${roomId}` });
  };

  const displayTimeLabels = ['12:00', '15:00', '18:00', '21:00', '24:00', '02:00'];

  return (
    <ScrollView className={styles.page} scrollY>
      <style>{SCHEDULE_STYLES}</style>
      <View className={styles.header}>
        <View className={styles.headerTitle}>📅 包厢排期</View>
        <View className={styles.headerSubtitle}>实时查看所有包厢使用状态</View>
      </View>

      <View className="date-tabs">
        {(['today', 'tomorrow', 'week'] as DateViewMode[]).map(mode => (
          <View
            key={mode}
            className={classnames('date-tab', { 'date-tab-active': dateMode === mode })}
            onClick={() => { setDateMode(mode); if (mode === 'today') setWeekIndex(0); if (mode === 'tomorrow') setWeekIndex(1); }}
          >
            {mode === 'today' ? '今天' : mode === 'tomorrow' ? '明天' : '最近7天'}
          </View>
        ))}
      </View>

      {dateMode === 'week' && (
        <View className="week-tabs">
          {weekDates.map((d, idx) => (
            <View
              key={d}
              className={classnames('week-tab', { 'week-tab-active': weekIndex === idx })}
              onClick={() => setWeekIndex(idx)}
            >
              {displayDayLabel(d)} {d.slice(5)}
            </View>
          ))}
        </View>
      )}

      <View className={styles.statsRow}>
        <View className={styles.statCard}>
          <View className={classnames(styles.statCardValue, getValueClass('total'))}>
            {stats.total}
          </View>
          <View className={styles.statCardLabel}>总包厢</View>
        </View>
        <View className={styles.statCard}>
          <View className={classnames(styles.statCardValue, getValueClass('available'))}>
            {stats.available}
          </View>
          <View className={styles.statCardLabel}>空闲</View>
        </View>
        <View className={styles.statCard}>
          <View className={classnames(styles.statCardValue, getValueClass('occupied'))}>
            {stats.occupied}
          </View>
          <View className={styles.statCardLabel}>使用中</View>
        </View>
        <View className={styles.statCard}>
          <View className={classnames(styles.statCardValue, getValueClass('reserved'))}>
            {stats.reserved}
          </View>
          <View className={styles.statCardLabel}>已预订</View>
        </View>
      </View>

      <View style={{ padding: '0 32rpx', color: '#6E6E91', fontSize: 24, marginTop: 16 }}>
        查看日期：<Text style={{ color: '#FFD700' }}>{activeDate}</Text>
        （{displayDayLabel(activeDate)}）
      </View>

      {selectedBookingInfo && (
        <View className="selected-banner">
          <style>{SCHEDULE_STYLES}</style>
          <View className="selected-banner-close" onClick={(e) => { e.stopPropagation(); setSelectedBookingId(null); }}>
            ✕
          </View>
          <View className="selected-banner-title">
            {selectedBookingInfo.roomName} · 完整占用时段
            {selectedBookingInfo.customerName && ` · ${selectedBookingInfo.customerName}`}
          </View>
          <View className="selected-banner-time">
            {selectedBookingInfo.startDate.slice(5)} {selectedBookingInfo.startTime}
            <Text style={{ color: '#FFD700', margin: '0 12rpx' }}>→</Text>
            {selectedBookingInfo.endDate.slice(5)} {selectedBookingInfo.endTime}
          </View>
          <View className="selected-banner-duration">
            共 {selectedBookingInfo.totalHours} 小时 {selectedBookingInfo.totalMins > 0 ? `${selectedBookingInfo.totalMins} 分` : ''}
            {selectedBookingInfo.segments.length > 1 && `（跨 ${selectedBookingInfo.segments.length} 天）`}
          </View>
        </View>
      )}

      <ScrollView className={styles.filterBar} scrollX>
        {ALL_TYPES.map(type => (
          <View
            key={type}
            className={classnames(styles.filterItem, {
              [styles.filterItemActive]: selectedType === type
            })}
            onClick={() => setSelectedType(type)}
          >
            {type === 'all' ? '全部' : ROOM_TYPE_LABEL[type]}
          </View>
        ))}
      </ScrollView>

      {filteredRooms.map(room => {
        const roomBookings = (schedules[room.id] || []).filter(b =>
          !b.date || b.date === activeDate
        );
        return (
          <View
            key={room.id}
            className={styles.timeline}
            onClick={() => goToRoomDetail(room.id)}
          >
            <View className={styles.timelineHeader}>
              <View className={styles.roomInfo}>
                <View>
                  <View className={styles.roomName}>{room.name}</View>
                  <View className={styles.roomNo}>
                    {ROOM_TYPE_LABEL[room.type]} · {room.roomNo} · {room.floor}楼 · {room.capacity}人
                  </View>
                </View>
              </View>
              <View className={classnames(styles.statusBadge, getStatusClass(room.status))}>
                {ROOM_STATUS_LABEL[room.status]}
              </View>
            </View>

            <View className={styles.timeAxis}>
              <View className={styles.timeLabels}>
                {displayTimeLabels.map(t => (
                  <View key={t} className={styles.timeLabel}>{t}</View>
                ))}
              </View>
              <View className={styles.trackContainer}>
                {roomBookings.map((booking, index) => {
                  const displayStart = booking.startTime === '00:00' ? '24:00' : booking.startTime;
                  const displayEnd = booking.endTime === '00:00' ? '24:00' : booking.endTime;
                  const left = timeToPercent(displayStart);
                  const right = 100 - timeToPercent(displayEnd);
                  const isOvernightSegment = (booking.date && booking.date !== TODAY) || booking.startTime < '12:00' || booking.endTime <= booking.startTime;
                  const blockClass = booking.status === 'occupied'
                    ? styles.blockOccupied
                    : styles.blockReserved;
                  return (
                    <View
                      key={`${booking.bookingId}-${index}`}
                      className={classnames(styles.bookingBlock, blockClass, {
                        'block-overnight': isOvernightSegment,
                        'block-selected': selectedBookingId === booking.bookingId
                      })}
                      style={{ left: `${left}%`, right: `${right}%` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBookingId(
                          selectedBookingId === booking.bookingId ? null : booking.bookingId
                        );
                      }}
                    >
                      <View className="block-label">
                        {booking.startTime}-{booking.endTime}
                      </View>
                      {isOvernightSegment && (
                        <View className="block-label" style={{ opacity: 0.9 }}>
                          {booking.date?.slice(5)}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        );
      })}

      <View className={styles.timeline}>
        <View className={styles.legend}>
          <View className={styles.legendItem}>
            <View className={classnames(styles.legendDot, styles.dotAvailable)} />
            <Text>空闲</Text>
          </View>
          <View className={styles.legendItem}>
            <View className={classnames(styles.legendDot, styles.dotReserved)} />
            <Text>已预订</Text>
          </View>
          <View className={styles.legendItem}>
            <View className={classnames(styles.legendDot, styles.dotOccupied)} />
            <Text>使用中</Text>
          </View>
          <View className={styles.legendItem}>
            <View className={classnames(styles.legendDot, styles.dotMaintenance)} />
            <Text>维护中</Text>
          </View>
          <View className={styles.legendItem}>
            <View className="styles.legendDot" style={{
              width: 20, height: 20, borderRadius: 4,
              background: 'repeating-linear-gradient(135deg, rgba(255,61,138,0.4), rgba(255,61,138,0.4) 3px, rgba(255,61,138,0.15) 3px, rgba(255,61,138,0.15) 6px)',
              border: '2rpx dashed #FFD700'
            }} />
            <Text>跨凌晨段</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default SchedulePage;
