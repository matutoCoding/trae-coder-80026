import React, { useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import GradientButton from '../../components/GradientButton';
import { useRoomStore } from '../../store/useRoomStore';
import { ROOM_TYPE_LABEL, ROOM_STATUS_LABEL } from '../../types/room';
import { getToday } from '../../utils/timeUtils';
import styles from './index.module.scss';

const RoomDetailPage: React.FC = () => {
  const router = useRouter();
  const roomId = router.params.id || '';
  const { getRoomById, schedules } = useRoomStore();

  const room = useMemo(() => getRoomById(roomId), [roomId, getRoomById]);
  const roomSchedule = useMemo(() => schedules[roomId] || [], [roomId, schedules]);

  if (!room) {
    return (
      <ScrollView className={styles.page}>
        <View style={{ textAlign: 'center', padding: '120rpx 0', color: '#6E6E91' }}>
          包厢不存在
        </View>
      </ScrollView>
    );
  }

  const handleBook = () => {
    Taro.switchTab({ url: '/pages/booking/index' });
  };

  const getStatusClass = (status: string) => {
    if (status === 'occupied') return styles.statusOccupied;
    return styles.statusReserved;
  };

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.roomHeader}>
        <View className={styles.roomHeaderName}>{room.name}</View>
        <View className={styles.roomHeaderNo}>
          {ROOM_TYPE_LABEL[room.type]} · {room.roomNo} · {ROOM_STATUS_LABEL[room.status]}
        </View>
        <View className={styles.roomHeaderInfo}>
          <View className={styles.roomHeaderInfoItem}>
            <View className={styles.roomHeaderInfoItemLabel}>楼层</View>
            <View className={styles.roomHeaderInfoItemValue}>{room.floor}楼</View>
          </View>
          <View className={styles.roomHeaderInfoItem}>
            <View className={styles.roomHeaderInfoItemLabel}>容纳</View>
            <View className={styles.roomHeaderInfoItemValue}>{room.capacity}人</View>
          </View>
          <View className={styles.roomHeaderInfoItem}>
            <View className={styles.roomHeaderInfoItemLabel}>单价</View>
            <View className={styles.roomHeaderInfoItemValue}>¥{room.hourlyRate}/h</View>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>包厢介绍</View>
        <View className={styles.description}>{room.description}</View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>设施设备</View>
        <View className={styles.facilities}>
          {room.facilities.map((facility, index) => (
            <View key={index} className={styles.facilityTag}>
              {facility}
            </View>
          ))}
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>今日排期（{getToday()}）</View>
        {roomSchedule.length === 0 ? (
          <View className={styles.emptySchedule}>今日暂无预订，全天空闲</View>
        ) : (
          <View className={styles.scheduleList}>
            {roomSchedule.map((slot, index) => (
              <View key={index} className={styles.scheduleItem}>
                <Text className={styles.scheduleItemTime}>
                  {slot.startTime} - {slot.endTime}
                </Text>
                <Text className={`${styles.scheduleItemStatus} ${getStatusClass(slot.status)}`}>
                  {ROOM_STATUS_LABEL[slot.status]}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className={styles.bottomBar}>
        <View className={styles.priceInfo}>
          <View className={styles.priceInfoLabel}>包厢价格</View>
          <View className={styles.priceInfoValue}>
            ¥{room.hourlyRate}
            <Text className={styles.priceInfoUnit}>/小时</Text>
          </View>
        </View>
        <GradientButton
          size="large"
          onClick={handleBook}
          disabled={room.status === 'maintenance'}
        >
          {room.status === 'maintenance' ? '维护中' : '立即预订'}
        </GradientButton>
      </View>
    </ScrollView>
  );
};

export default RoomDetailPage;
