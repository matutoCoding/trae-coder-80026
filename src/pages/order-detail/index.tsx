import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import GradientButton from '../../components/GradientButton';
import { useBookingStore } from '../../store/useBookingStore';
import { usePackageStore } from '../../store/usePackageStore';
import { useQueueStore } from '../../store/useQueueStore';
import { BOOKING_STATUS_LABEL } from '../../types/booking';
import { ROOM_TYPE_LABEL } from '../../types/room';
import styles from './index.module.scss';

const OrderDetailPage: React.FC = () => {
  const router = useRouter();
  const bookingId = router.params.id || '';
  const { getBookingById, extendBooking, cancelBooking, checkInBooking, checkOutBooking } = useBookingStore();
  const { getPackageById } = usePackageStore();
  const { counters } = useQueueStore();

  const [showExtend, setShowExtend] = useState(false);
  const [extendHours, setExtendHours] = useState(1);

  const booking = useMemo(() => getBookingById(bookingId), [bookingId, getBookingById]);

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
      Taro.showToast({ title: '续钟失败', icon: 'none' });
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
    </ScrollView>
  );
};

export default OrderDetailPage;
