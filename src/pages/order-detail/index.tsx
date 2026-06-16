import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import GradientButton from '../../components/GradientButton';
import { useBookingStore } from '../../store/useBookingStore';
import { usePackageStore } from '../../store/usePackageStore';
import { useQueueStore } from '../../store/useQueueStore';
import { useRoomStore } from '../../store/useRoomStore';
import { BOOKING_STATUS_LABEL } from '../../types/booking';
import { ROOM_TYPE_LABEL } from '../../types/room';
import styles from './index.module.scss';

const ORDER_DETAIL_STYLES = `
.extend-modal {
  background: #1E1E3A;
  border-radius: 24rpx;
  padding: 48rpx;
  margin: 48rpx;
}
.extend-modal-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #FFFFFF;
  text-align: center;
  margin-bottom: 32rpx;
}
.hour-options {
  display: flex;
  gap: 16rpx;
  margin-bottom: 32rpx;
}
.hour-option {
  flex: 1;
  padding: 32rpx 16rpx;
  background: rgba(123, 47, 253, 0.1);
  border: 2rpx solid rgba(255,255,255,0.1);
  border-radius: 16rpx;
  text-align: center;
  transition: all 0.2s;
}
.hour-option-active {
  background: linear-gradient(135deg, rgba(123,47,253,0.3) 0%, rgba(255,61,138,0.3) 100%);
  border-color: #7B2FFD;
}
.hour-option-hours {
  font-size: 40rpx;
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 4rpx;
}
.hour-option-price {
  font-size: 24rpx;
  color: #FFD700;
}
.extend-total {
  text-align: center;
  padding: 32rpx;
  background: rgba(123, 47, 253, 0.1);
  border-radius: 16rpx;
  margin-bottom: 32rpx;
}
.extend-total-label {
  font-size: 24rpx;
  color: #8E8EB2;
  margin-bottom: 8rpx;
}
.extend-total-value {
  font-size: 56rpx;
  font-weight: 700;
  color: #FFD700;
}
.extend-actions {
  display: flex;
  gap: 24rpx;
}
`;

const OrderDetailPage: React.FC = () => {
  const router = useRouter();
  const bookingId = router.params.id || '';
  const { getBookingById, extendBooking, cancelBooking, checkInBooking, checkOutBooking } = useBookingStore();
  const { getPackageById } = usePackageStore();
  const { counters } = useQueueStore();
  const { getRoomById } = useRoomStore();

  const [showExtend, setShowExtend] = useState(false);
  const [extendHours, setExtendHours] = useState(1);

  const booking = useMemo(() => getBookingById(bookingId), [bookingId, getBookingById]);

  const extendPrice = useMemo(() => {
    if (!booking) return 0;
    const room = getRoomById(booking.roomId);
    return (room?.hourlyRate || 0) * extendHours;
  }, [booking, extendHours, getRoomById]);

  const unitPrice = useMemo(() => {
    if (!booking) return 0;
    const room = getRoomById(booking.roomId);
    return room?.hourlyRate || 0;
  }, [booking, getRoomById]);

  if (!booking) {
    return (
      <ScrollView className={styles.page}>
        <View style={{ textAlign: 'center', padding: '120rpx 0', color: '#6E6E91' }}>
          订单不存在
        </View>
      </ScrollView>
    );
  }

  const packageList = booking.packageIds.map(id => getPackageById(id)).filter(Boolean);

  const counterName = counters.find(c => c.id === booking.counterId)?.name || '-';

  const canExtend = booking.status === 'checked_in' || booking.status === 'confirmed' || booking.status === 'extended';
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
  const canCheckIn = booking.status === 'confirmed';
  const canCheckOut = booking.status === 'checked_in' || booking.status === 'extended';

  const handleExtend = async () => {
    const success = await extendBooking(bookingId, extendHours);
    if (success) {
      Taro.showToast({ title: '续钟成功', icon: 'success' });
      setShowExtend(false);
    } else {
      Taro.showToast({ title: '续钟失败，时段可能冲突', icon: 'none' });
    }
  };

  const handleCancel = () => {
    Taro.showModal({
      title: '取消预订',
      content: '确定要取消该预订吗？',
      success: (res) => {
        if (res.confirm) {
          cancelBooking(bookingId);
          Taro.showToast({ title: '已取消', icon: 'success' });
        }
      }
    });
  };

  const handleCheckIn = () => {
    checkInBooking(bookingId);
    Taro.showToast({ title: '已入场', icon: 'success' });
  };

  const handleCheckOut = () => {
    Taro.showModal({
      title: '确认离场',
      content: '客人已离场并结算费用？',
      success: (res) => {
        if (res.confirm) {
          checkOutBooking(bookingId);
          Taro.showToast({ title: '已完成', icon: 'success' });
        }
      }
    });
  };

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.statusHeader}>
        <View className={styles.statusHeaderStatus}>
          {BOOKING_STATUS_LABEL[booking.status]}
        </View>
        <View className={styles.statusHeaderDesc}>
          订单号：{booking.orderNo}
        </View>
        {booking.queueNo && (
          <View className={styles.statusHeaderQueueNo}>
            排队号：{booking.queueNo} · 服务窗口：{counterName}
          </View>
        )}
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>包厢信息</View>
        <View className={styles.infoRow}>
          <Text className={styles.infoRowLabel}>包厢名称</Text>
          <Text className={styles.infoRowValue}>{booking.roomName}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoRowLabel}>包厢编号</Text>
          <Text className={styles.infoRowValue}>{booking.roomNo}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoRowLabel}>包厢类型</Text>
          <Text className={styles.infoRowValue}>{ROOM_TYPE_LABEL[booking.roomType]}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoRowLabel}>人数</Text>
          <Text className={styles.infoRowValue}>{booking.peopleCount}人</Text>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>时间信息</View>
        <View className={styles.infoRow}>
          <Text className={styles.infoRowLabel}>预订日期</Text>
          <Text className={styles.infoRowValue}>{booking.date}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoRowLabel}>开始时间</Text>
          <Text className={styles.infoRowValue}>{booking.startTime}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoRowLabel}>结束时间</Text>
          <Text className={styles.infoRowValue}>
            {booking.endTime}
            {booking.extendAmount > 0 && ' (已续钟)'}
          </Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoRowLabel}>总时长</Text>
          <Text className={styles.infoRowValue}>{booking.duration}小时</Text>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>客户信息</View>
        <View className={styles.infoRow}>
          <Text className={styles.infoRowLabel}>姓名</Text>
          <Text className={styles.infoRowValue}>{booking.customerName}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoRowLabel}>手机号</Text>
          <Text className={styles.infoRowValue}>{booking.customerPhone}</Text>
        </View>
      </View>

      {packageList.length > 0 && (
        <View className={styles.section}>
          <View className={styles.sectionTitle}>酒水套餐</View>
          {packageList.map((pkg, index) => pkg && (
            <View key={index} className={styles.packageItem}>
              <Text className={styles.packageItemName}>{pkg.name}</Text>
              <Text className={styles.packageItemPrice}>¥{pkg.discountPrice}</Text>
            </View>
          ))}
        </View>
      )}

      <View className={styles.section}>
        <View className={styles.sectionTitle}>费用明细</View>
        <View className={styles.infoRow}>
          <Text className={styles.infoRowLabel}>包厢费用</Text>
          <Text className={styles.infoRowValue}>¥{booking.baseAmount}</Text>
        </View>
        {booking.packageAmount > 0 && (
          <View className={styles.infoRow}>
            <Text className={styles.infoRowLabel}>套餐费用</Text>
            <Text className={styles.infoRowValue}>¥{booking.packageAmount}</Text>
          </View>
        )}
        {booking.extendAmount > 0 && (
          <View className={styles.infoRow}>
            <Text className={styles.infoRowLabel}>续钟费用</Text>
            <Text className={styles.infoRowValue}>¥{booking.extendAmount}</Text>
          </View>
        )}
        <View className={styles.totalRow}>
          <Text className={styles.totalRowLabel}>应付总额</Text>
          <Text className={styles.totalRowValue}>¥{booking.totalAmount}</Text>
        </View>
      </View>

      {(canExtend || canCancel || canCheckIn || canCheckOut) && (
        <View className={styles.bottomBar}>
          {canCancel && (
            <GradientButton block ghost onClick={handleCancel}>
              取消订单
            </GradientButton>
          )}
          {canCheckIn && (
            <GradientButton block variant="cyan" onClick={handleCheckIn}>
              确认入场
            </GradientButton>
          )}
          {canCheckOut && (
            <GradientButton block variant="gold" onClick={handleCheckOut}>
              确认离场
            </GradientButton>
          )}
          {canExtend && (
            <GradientButton block onClick={() => setShowExtend(true)}>
              续钟
            </GradientButton>
          )}
        </View>
      )}

      {showExtend && (
        <>
          <style>{ORDER_DETAIL_STYLES}</style>
          <View
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
            onClick={() => setShowExtend(false)}
          >
            <View className="extend-modal" onClick={(e) => e.stopPropagation()}>
              <View className="extend-modal-title">续钟时间</View>

              <View className="hour-options">
                {[1, 2, 3, 4].map(h => (
                  <View
                    key={h}
                    className={classnames('hour-option', {
                      'hour-option-active': extendHours === h
                    })}
                    onClick={() => setExtendHours(h)}
                  >
                    <View className="hour-option-hours">{h}h</View>
                    <View className="hour-option-price">¥{unitPrice * h}</View>
                  </View>
                ))}
              </View>

              <View className="extend-total">
                <View className="extend-total-label">续钟费用</View>
                <View className="extend-total-value">¥{extendPrice}</View>
              </View>

              <View className="extend-actions">
                <GradientButton
                  block
                  ghost
                  onClick={() => setShowExtend(false)}
                >
                  取消
                </GradientButton>
                <GradientButton block onClick={handleExtend}>
                  确认续钟
                </GradientButton>
              </View>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
};

export default OrderDetailPage;
