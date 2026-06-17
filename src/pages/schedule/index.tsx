import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useActionSheet } from '@tarojs/taro';
import classnames from 'classnames';
import { useRoomStore } from '../../store/useRoomStore';
import { useBookingStore } from '../../store/useBookingStore';
import type { RoomType, RoomStatus } from '../../types/room';
import { ROOM_TYPE_LABEL, ROOM_STATUS_LABEL } from '../../types/room';
import { getTimeSlots, getToday, addDays, calculateMinutesDiff, addHours, toMinutes, hasConflict } from '../../utils/timeUtils';
import GradientButton from '../../components/GradientButton';
import styles from './index.module.scss';

const ALL_TYPES: (RoomType | 'all')[] = ['all', 'small', 'medium', 'large', 'vip', 'luxury'];
const TIME_SLOTS = getTimeSlots(12, 26, 2);
const START_HOUR = 12;
const END_HOUR = 26;

type DateViewMode = 'today' | 'tomorrow' | 'week' | 'overnight';

const DURATION_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10];
const START_TIME_OPTIONS = [
  '12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00','00:00','01:00','02:00'
];

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
.overnight-card {
  margin: 20rpx 32rpx;
  padding: 28rpx;
  background: rgba(255,255,255,0.04);
  border: 2rpx solid rgba(255,215,0,0.3);
  border-radius: 20rpx;
}
.overnight-card-selected {
  border-color: #FFD700;
  background: rgba(255, 215, 0, 0.06);
  box-shadow: 0 0 24rpx rgba(255, 215, 0, 0.35);
}
.overnight-card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}
.overnight-room-name {
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
}
.overnight-customer {
  color: #8E8EB2;
  font-size: 24rpx;
}
.overnight-segments {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.overnight-segment {
  display: flex;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background: rgba(123,47,253,0.12);
  border-radius: 12rpx;
  border: 2rpx solid rgba(255,61,138,0.2);
}
.overnight-segment-selected {
  border-color: #FFD700;
  background: rgba(255,215,0,0.12);
}
.overnight-segment-date {
  color: #FFD700;
  font-size: 22rpx;
  margin-right: 20rpx;
}
.overnight-segment-time {
  color: #fff;
  font-size: 26rpx;
  font-weight: 500;
}
.overnight-segment-hours {
  color: #6E6E91;
  font-size: 22rpx;
}
.search-panel {
  margin: 20rpx 32rpx;
  padding: 28rpx;
  background: rgba(123,47,253,0.08);
  border: 2rpx solid rgba(123,47,253,0.3);
  border-radius: 20rpx;
}
.search-row {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
  gap: 16rpx;
}
.search-label {
  width: 140rpx;
  color: #8E8EB2;
  font-size: 26rpx;
  flex-shrink: 0;
}
.search-stepper {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
}
.search-step-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(123,47,253,0.2);
  color: #fff;
  font-size: 32rpx;
  line-height: 56rpx;
  text-align: center;
}
.search-step-value {
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  min-width: 80rpx;
  text-align: center;
}
.search-tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  flex: 1;
}
.search-tag {
  padding: 14rpx 24rpx;
  border-radius: 40rpx;
  background: rgba(255,255,255,0.06);
  color: #8E8EB2;
  font-size: 24rpx;
  border: 2rpx solid transparent;
}
.search-tag-active {
  background: linear-gradient(135deg, rgba(123,47,253,0.35) 0%, rgba(255,61,138,0.35) 100%);
  color: #fff;
  border-color: #FFD700;
}
.search-result-card {
  margin: 16rpx 32rpx;
  padding: 24rpx 28rpx;
  background: rgba(255,255,255,0.04);
  border: 2rpx solid rgba(123,47,253,0.3);
  border-radius: 16rpx;
}
.search-result-title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.search-result-room {
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
}
.search-result-price {
  color: #FFD700;
  font-size: 28rpx;
  font-weight: 700;
}
.search-result-meta {
  color: #8E8EB2;
  font-size: 22rpx;
  margin-bottom: 8rpx;
}
.search-result-reason {
  background: rgba(0, 200, 150, 0.1);
  color: #00E5A8;
  font-size: 22rpx;
  padding: 10rpx 16rpx;
  border-radius: 8rpx;
  margin-bottom: 16rpx;
  display: inline-block;
}
.search-result-actions {
  display: flex;
  justify-content: flex-end;
}
.search-empty {
  padding: 48rpx 0;
  text-align: center;
  color: #6E6E91;
  font-size: 26rpx;
}
.search-btn-row {
  margin-top: 8rpx;
  display: flex;
  gap: 16rpx;
}
.overnight-total {
  margin-top: 14rpx;
  padding-top: 14rpx;
  border-top: 2rpx dashed rgba(255,255,255,0.08);
  display: flex;
  justify-content: space-between;
  color: #8E8EB2;
  font-size: 22rpx;
}
.overnight-total-value {
  color: #FFD700;
  font-weight: 600;
}
.switch-tab-row {
  display: flex;
  padding: 16rpx 32rpx;
  gap: 16rpx;
}
.switch-tab-btn {
  flex: 1;
  padding: 18rpx 0;
  text-align: center;
  border-radius: 12rpx;
  background: rgba(255,255,255,0.04);
  color: #8E8EB2;
  font-size: 24rpx;
  border: 2rpx solid rgba(255,255,255,0.08);
}
.switch-tab-btn-active {
  background: linear-gradient(135deg, rgba(123,47,253,0.3) 0%, rgba(255,61,138,0.3) 100%);
  color: #fff;
  border-color: #FFD700;
  font-weight: 600;
}
`;

const SchedulePage: React.FC = () => {
  const { rooms, schedules } = useRoomStore();
  const { getBookingById } = useBookingStore();
  const [selectedType, setSelectedType] = useState<RoomType | 'all'>('all');
  const [dateMode, setDateMode] = useState<DateViewMode>('today');
  const [weekIndex, setWeekIndex] = useState(0);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'schedule' | 'search'>('schedule');

  const [searchPeople, setSearchPeople] = useState(4);
  const [searchDate, setSearchDate] = useState(getToday());
  const [searchStartTime, setSearchStartTime] = useState('19:00');
  const [searchDuration, setSearchDuration] = useState(3);
  const [showDateSheet, setShowDateSheet] = useState(false);
  const [searchTriggered, setSearchTriggered] = useState(false);

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

  const overnightBookings = useMemo(() => {
    const byBooking: Record<string, {
      bookingId: string;
      customerName?: string;
      roomId: string;
      roomName: string;
      roomNo: string;
      roomType: string;
      capacity: number;
      segments: { date: string; startTime: string; endTime: string; hours: number }[];
      totalHours: number;
    }> = {};
    for (const rId of Object.keys(schedules)) {
      const room = rooms.find(r => r.id === rId);
      if (!room) continue;
      for (const slot of schedules[rId] || []) {
        const b = byBooking[slot.bookingId] || {
          bookingId: slot.bookingId,
          customerName: getBookingById(slot.bookingId)?.customerName,
          roomId: rId,
          roomName: room.name,
          roomNo: room.roomNo,
          roomType: ROOM_TYPE_LABEL[room.type],
          capacity: room.capacity,
          segments: [],
          totalHours: 0
        };
        const hours = calculateMinutesDiff(slot.startTime, slot.endTime) / 60;
        b.segments.push({ date: slot.date || TODAY, startTime: slot.startTime, endTime: slot.endTime, hours });
        b.totalHours += hours;
        byBooking[slot.bookingId] = b;
      }
    }
    return Object.values(byBooking)
      .filter(b => b.segments.length > 1)
      .sort((a, b) => a.segments[0].date.localeCompare(b.segments[0].date) || a.segments[0].startTime.localeCompare(b.segments[0].startTime));
  }, [schedules, rooms, TODAY, getBookingById]);

  const searchResults = useMemo(() => {
    const startHour = parseInt(searchStartTime.split(':')[0], 10);
    let effDate = searchDate;
    if (startHour < 12) effDate = addDays(searchDate, 1);
    const endTime = addHours(searchStartTime, searchDuration);
    const results: {
      room: typeof rooms[0];
      price: number;
      reason: string;
      date: string;
      startTime: string;
      endTime: string;
      duration: number;
    }[] = [];
    for (const room of rooms) {
      if (room.status === 'maintenance') continue;
      if (room.capacity < searchPeople) continue;
      if (selectedType !== 'all' && room.type !== selectedType) continue;
      const conflict = hasConflict(schedules[room.id] || [], effDate, searchStartTime, endTime, 'no-such-booking');
      if (conflict) continue;
      const price = Math.ceil(room.hourlyRate * searchDuration);
      const tightness = room.capacity - searchPeople;
      let reason = '';
      if (tightness === 0) reason = '刚好容纳，空间利用率最佳';
      else if (tightness <= 2) reason = `多${tightness}人空间，舒适不拥挤`;
      else if (tightness <= 4) reason = `宽松${tightness}人空间，适合加人`;
      else reason = `富余${tightness}人，空间宽敞`;
      if (startHour >= 19 && startHour <= 23) reason += ' · 黄金时段推荐';
      results.push({ room, price, reason, date: effDate, startTime: searchStartTime, endTime, duration: searchDuration });
    }
    results.sort((a, b) => (a.room.capacity - searchPeople) - (b.room.capacity - searchPeople) || a.price - b.price);
    return results;
  }, [rooms, schedules, searchPeople, searchDate, searchStartTime, searchDuration, selectedType]);

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

  const handleGoToBook = (result: typeof searchResults[0]) => {
    const qs = new URLSearchParams({
      roomId: result.room.id,
      roomType: result.room.type,
      peopleCount: String(searchPeople),
      date: result.date,
      startTime: result.startTime,
      duration: String(result.duration)
    });
    Taro.navigateTo({ url: `/pages/booking/index?${qs.toString()}` });
  };

  const handlePeopleStep = (delta: number) => {
    setSearchPeople(p => Math.max(1, Math.min(30, p + delta)));
  };

  const handleDateSelect = (delta: number) => {
    setSearchDate(addDays(TODAY, delta));
    setShowDateSheet(false);
  };

  const triggerSearch = () => {
    setSearchTriggered(true);
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
        {(['today', 'tomorrow', 'week', 'overnight'] as DateViewMode[]).map(mode => (
          <View
            key={mode}
            className={classnames('date-tab', { 'date-tab-active': dateMode === mode })}
            onClick={() => { setDateMode(mode); if (mode === 'today') setWeekIndex(0); if (mode === 'tomorrow') setWeekIndex(1); }}
          >
            {mode === 'today' ? '今天' : mode === 'tomorrow' ? '明天' : mode === 'week' ? '最近7天' : '跨夜视图'}
          </View>
        ))}
      </View>

      <View className="switch-tab-row">
        <View
          className={classnames('switch-tab-btn', { 'switch-tab-btn-active': viewMode === 'schedule' })}
          onClick={() => setViewMode('schedule')}
        >📅 排期视图</View>
        <View
          className={classnames('switch-tab-btn', { 'switch-tab-btn-active': viewMode === 'search' })}
          onClick={() => { setViewMode('search'); setSearchTriggered(false); }}
        >🔍 批量查空档</View>
      </View>

      {viewMode === 'search' && (
        <View className="search-panel">
          <View className="search-row">
            <View className="search-label">人数</View>
            <View className="search-stepper">
              <View className="search-step-btn" onClick={() => handlePeopleStep(-1)}>-</View>
              <View className="search-step-value">{searchPeople} 人</View>
              <View className="search-step-btn" onClick={() => handlePeopleStep(1)}>+</View>
            </View>
          </View>

          <View className="search-row">
            <View className="search-label">日期</View>
            <View className="search-tag-row">
              {[0, 1, 2, 3, 7].map(i => (
                <View
                  key={i}
                  className={classnames('search-tag', { 'search-tag-active': searchDate === addDays(TODAY, i) })}
                  onClick={() => handleDateSelect(i)}
                >{i === 0 ? '今天' : i === 1 ? '明天' : i === 7 ? '7天后' : `${i}天后`} {addDays(TODAY, i).slice(5)}</View>
              ))}
            </View>
          </View>

          <View className="search-row">
            <View className="search-label">开始时间</View>
            <View className="search-tag-row">
              {['14:00','16:00','18:00','19:00','20:00','21:00','22:00','23:00','00:00'].map(t => (
                <View
                  key={t}
                  className={classnames('search-tag', { 'search-tag-active': searchStartTime === t })}
                  onClick={() => setSearchStartTime(t)}
                >{t}</View>
              ))}
            </View>
          </View>

          <View className="search-row">
            <View className="search-label">时长</View>
            <View className="search-tag-row">
              {DURATION_OPTIONS.map(h => (
                <View
                  key={h}
                  className={classnames('search-tag', { 'search-tag-active': searchDuration === h })}
                  onClick={() => setSearchDuration(h)}
                >{h} 小时</View>
              ))}
            </View>
          </View>

          <View className="search-btn-row">
            <GradientButton block onClick={triggerSearch}>查询可用包厢</GradientButton>
          </View>
        </View>
      )}

      {viewMode === 'search' && searchTriggered && (
        <>
          <View style={{ padding: '16rpx 32rpx', color: '#FFD700', fontSize: 26, fontWeight: 600 }}>
            可用包厢 {searchResults.length} 间 · 共 {searchPeople} 人 · {searchDate.slice(5)} {searchStartTime} 起 {searchDuration} 小时
          </View>
          {searchResults.length === 0 ? (
            <View className="search-empty">暂无可用包厢，建议调整时段或减少人数</View>
          ) : (
            searchResults.map(result => (
              <View key={result.room.id} className="search-result-card">
                <View className="search-result-title">
                  <View className="search-result-room">{result.room.name} · {result.room.roomNo}</View>
                  <View className="search-result-price">¥{result.price}</View>
                </View>
                <View className="search-result-meta">{result.roomType || ROOM_TYPE_LABEL[result.room.type]} · 容纳{result.room.capacity}人 · {result.room.floor}楼 · 单价¥{result.room.hourlyRate}/h</View>
                <View className="search-result-meta">{result.date} {result.startTime} → {result.endTime}（{result.duration}小时）</View>
                <View className="search-result-reason">{result.reason}</View>
                <View className="search-result-actions">
                  <GradientButton size="small" onClick={() => handleGoToBook(result)}>带信息去预订</GradientButton>
                </View>
              </View>
            ))
          )}
        </>
      )}

      {dateMode === 'overnight' && viewMode === 'schedule' && (
        <>
          <View style={{ padding: '16rpx 32rpx', color: '#FFD700', fontSize: 26, fontWeight: 600 }}>
            跨夜订单 {overnightBookings.length} 条 · 点击任意段查看完整时段
          </View>
          {overnightBookings.length === 0 ? (
            <View className="search-empty">暂无跨夜订单</View>
          ) : (
            overnightBookings.map(b => (
              <View
                key={b.bookingId}
                className={classnames('overnight-card', { 'overnight-card-selected': selectedBookingId === b.bookingId })}
              >
                <View className="overnight-card-title">
                  <View>
                    <Text className="overnight-room-name">{b.roomName}</Text>
                    <Text style={{ color: '#8E8EB2', fontSize: 22, marginLeft: 12 }}>{b.roomType} · {b.roomNo} · {b.capacity}人</Text>
                  </View>
                  <View className="overnight-customer">{b.customerName || '客人'}</View>
                </View>
                <View className="overnight-segments">
                  {b.segments.map((s, i) => (
                    <View
                      key={i}
                      className={classnames('overnight-segment', { 'overnight-segment-selected': selectedBookingId === b.bookingId })}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBookingId(selectedBookingId === b.bookingId ? null : b.bookingId);
                      }}
                    >
                      <View>
                        <Text className="overnight-segment-date">{s.date.slice(5)}</Text>
                        <Text className="overnight-segment-time">{s.startTime} - {s.endTime}</Text>
                      </View>
                      <View className="overnight-segment-hours">{s.hours} 小时</View>
                    </View>
                  ))}
                </View>
                <View className="overnight-total">
                  <View>合计总时长</View>
                  <View className="overnight-total-value">{b.totalHours} 小时</View>
                </View>
              </View>
            ))
          )}
        </>
      )}

      {dateMode === 'week' && viewMode === 'schedule' && (
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

      {viewMode === 'schedule' && dateMode !== 'overnight' && (
        <>
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
        </>
      )}
    </ScrollView>
  );
};

export default SchedulePage;
