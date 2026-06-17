import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import type { Booking } from '../../types/booking';
import { BOOKING_STATUS_LABEL } from '../../types/booking';
import { ROOM_TYPE_LABEL as RoomTypeLabels } from '../../types/room';
import GradientButton from '../GradientButton';
import styles from './index.module.scss';

interface OrderCardProps {
  booking: Booking;
  onExtend?: () => void;
  onCancel?: () => void;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  onModify?: () => void;
  batchMode?: boolean;
  selected?: boolean;
  selectable?: boolean;
  onToggleSelect?: () => void;
}

const OrderCard: React.FC<OrderCardProps> = ({
  booking,
  onExtend,
  onCancel,
  onCheckIn,
  onCheckOut,
  onModify,
  batchMode,
  selected,
  selectable,
  onToggleSelect
}) => {
  const statusClass = {
    pending: styles.statusPending,
    confirmed: styles.statusConfirmed,
    checked_in: styles.statusCheckedIn,
    completed: styles.statusCompleted,
    cancelled: styles.statusCancelled,
    extended: styles.statusExtended
  }[booking.status];

  const handleClick = () => {
    Taro.navigateTo({
      url: `/pages/order-detail/index?id=${booking.id}`
    });
  };

  const showActions = booking.status !== 'completed' && booking.status !== 'cancelled';
  const canExtend = booking.status === 'checked_in' || booking.status === 'confirmed' || booking.status === 'extended';
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
  const canCheckIn = booking.status === 'confirmed';
  const canCheckOut = booking.status === 'checked_in' || booking.status === 'extended';
  const canModify = booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'extended';

  return (
    <View
      className={classnames(styles.card, {
        [styles.cardSelected]: selected,
        [styles.cardUnselectable]: batchMode && !selectable
      })}
      onClick={handleClick}
    >
      {batchMode && (
        <View
          className={classnames('batch-checkbox', {
            'batch-checkbox-checked': selected,
            'batch-checkbox-disabled': !selectable
          })}
          onClick={(e) => {
            e.stopPropagation();
            if (selectable) onToggleSelect && onToggleSelect();
          }}
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '3rpx solid ' + (selectable ? (selected ? '#FFD700' : 'rgba(255,255,255,0.3)') : 'rgba(120,120,140,0.3)'),
            background: selected ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' : 'rgba(255,255,255,0.04)',
            color: selected ? '#1E1E3A' : 'transparent',
            textAlign: 'center',
            lineHeight: '40rpx',
            fontSize: 24,
            fontWeight: 800,
            zIndex: 10
          }}
        >{selected ? '✓' : ''}</View>
      )}
      <View className={styles.header} style={{ paddingLeft: batchMode ? 70 : undefined }}>
        <View className={styles.orderNo}>订单号: {booking.orderNo}</View>
        <View className={classnames(styles.statusBadge, statusClass)}>
          {BOOKING_STATUS_LABEL[booking.status]}
        </View>
      </View>

      <View className={styles.info} style={{ paddingLeft: batchMode ? 70 : undefined }}>
        <View className={styles.roomName}>
          {booking.roomName} · {booking.roomNo}
        </View>
        <View className={styles.roomDetail}>
          {RoomTypeLabels[booking.roomType]} · {booking.peopleCount}人 · {booking.customerName}
        </View>
        <View className={styles.timeInfo}>
          {booking.date} {booking.startTime} - {booking.endTime}（{booking.duration}小时）
        </View>
      </View>

      <View className={styles.footer} style={{ paddingLeft: batchMode ? 70 : undefined }}>
        <View className={styles.price}>
          <Text className={styles.priceLabel}>合计</Text>
          ¥{booking.totalAmount}
        </View>

        {showActions && (
          <View className={styles.actions} onClick={(e) => e.stopPropagation()}>
            {canCancel && (
              <GradientButton size="small" ghost onClick={onCancel}>
                取消
              </GradientButton>
            )}
            {canCheckIn && (
              <GradientButton size="small" variant="cyan" onClick={onCheckIn}>
                入场
              </GradientButton>
            )}
            {canCheckOut && (
              <GradientButton size="small" variant="gold" onClick={onCheckOut}>
                离场
              </GradientButton>
            )}
            {canModify && (
              <GradientButton size="small" variant="cyan" onClick={onModify}>
                改预订
              </GradientButton>
            )}
            {canExtend && (
              <GradientButton size="small" onClick={onExtend}>
                续钟
              </GradientButton>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

export default OrderCard;
