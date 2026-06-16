import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useRoomStore } from '../../store/useRoomStore';
import type { RoomType, RoomStatus } from '../../types/room';
import { ROOM_TYPE_LABEL, ROOM_STATUS_LABEL } from '../../types/room';
import { getTimeSlots } from '../../utils/timeUtils';
import styles from './index.module.scss';

const ALL_TYPES: (RoomType | 'all')[] = ['all', 'small', 'medium', 'large', 'vip', 'luxury'];
const TIME_SLOTS = getTimeSlots(12, 25, 2);
const START_HOUR = 12;
const END_HOUR = 24;

const SchedulePage: React.FC = () => {
  const { rooms, schedules } = useRoomStore();
  const [selectedType, setSelectedType] = useState<RoomType | 'all'>('all');

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
    return (totalMinutes / totalRange) * 100;
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

  const displayTimeLabels = ['12:00', '15:00', '18:00', '21:00', '24:00'];

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.header}>
        <View className={styles.headerTitle}>📅 包厢排期</View>
        <View className={styles.headerSubtitle}>实时查看所有包厢使用状态</View>
      </View>

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
        const roomBookings = schedules[room.id] || [];
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
                  const left = timeToPercent(booking.startTime);
                  const right = 100 - timeToPercent(booking.endTime);
                  const blockClass = booking.status === 'occupied'
                    ? styles.blockOccupied
                    : styles.blockReserved;
                  return (
                    <View
                      key={index}
                      className={classnames(styles.bookingBlock, blockClass)}
                      style={{ left: `${left}%`, right: `${right}%` }}
                    >
                      {booking.startTime}-{booking.endTime}
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
        </View>
      </View>
    </ScrollView>
  );
};

export default SchedulePage;
