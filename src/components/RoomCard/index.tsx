import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import Taro from '@tarojs/taro';
import type { Room } from '../../types/room';
import { ROOM_TYPE_LABEL, ROOM_STATUS_LABEL } from '../../types/room';
import styles from './index.module.scss';

interface RoomCardProps {
  room: Room;
  onClick?: () => void;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, onClick }) => {
  const statusClass = {
    available: styles.statusAvailable,
    occupied: styles.statusOccupied,
    reserved: styles.statusReserved,
    maintenance: styles.statusMaintenance
  }[room.status];

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      Taro.navigateTo({
        url: `/pages/room-detail/index?id=${room.id}`
      });
    }
  };

  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.header}>
        <View>
          <View className={styles.title}>{room.name}</View>
          <View className={styles.subtitle}>
            {ROOM_TYPE_LABEL[room.type]} · {room.roomNo} · {room.floor}楼
          </View>
        </View>
        <View className={classnames(styles.statusBadge, statusClass)}>
          {ROOM_STATUS_LABEL[room.status]}
        </View>
      </View>

      <View className={styles.info}>
        <View className={styles.infoItem}>
          <Text className={styles.infoItemLabel}>容纳：</Text>
          <Text>{room.capacity}人</Text>
        </View>
      </View>

      <View className={styles.facilities}>
        {room.facilities.slice(0, 5).map((facility, index) => (
          <View key={index} className={styles.facilityTag}>
            {facility}
          </View>
        ))}
      </View>

      <View className={styles.footer}>
        <View className={styles.price}>
          ¥{room.hourlyRate}
          <Text className={styles.priceUnit}>/小时</Text>
        </View>
      </View>
    </View>
  );
};

export default RoomCard;
