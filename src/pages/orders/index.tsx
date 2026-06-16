import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import OrderCard from '../../components/OrderCard';
import GradientButton from '../../components/GradientButton';
import { useBookingStore } from '../../store/useBookingStore';
import { useRoomStore } from '../../store/useRoomStore';
import type { BookingStatus } from '../../types/booking';
import { BOOKING_STATUS_LABEL } from '../../types/booking';
import styles from './index.module.scss';

type TabType = 'all' | BookingStatus;

const TABS: { key: TabType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待确认' },
  { key: 'confirmed', label: '已确认' },
  { key: 'checked_in', label: '进行中' },
  { key: 'completed', label: '已完成' }
];

const OrdersPage: React.FC = () => {
  const { bookings, extendBooking, cancelBooking, checkInBooking, checkOutBooking } = useBookingStore();
  const { getRoomById } = useRoomStore();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendBookingId, setExtendBookingId] = useState<string | null>(null);
  const [selectedHours, setSelectedHours] = useState(1);

  const filteredBookings = useMemo(() => {
    if (activeTab === 'all') return bookings;
    return bookings.filter(b => b.status === activeTab);
  }, [bookings, activeTab]);

  const extendPrice = useMemo(() => {
    if (!extendBookingId) return 0;
    const booking = bookings.find(b => b.id === extendBookingId);
    if (!booking) return 0;
    const room = getRoomById(booking.roomId);
    return (room?.hourlyRate || 0) * selectedHours;
  }, [extendBookingId, selectedHours, bookings, getRoomById]);

  const handleExtend = (bookingId: string) => {
    setExtendBookingId(bookingId);
    setSelectedHours(1);
    setShowExtendModal(true);
  };

  const confirmExtend = async () => {
    if (!extendBookingId) return;

    const success = await extendBooking(extendBookingId, selectedHours);
    if (success) {
      Taro.showToast({ title: '续钟成功', icon: 'success' });
      setShowExtendModal(false);
      setExtendBookingId(null);
    } else {
      Taro.showToast({ title: '续钟失败，时段可能冲突', icon: 'none' });
    }
  };

  const handleCancel = (bookingId: string) => {
    Taro.showModal({
      title: '取消预订',
      content: '确定要取消该预订吗？',
      success: (res) => {
        if (res.confirm) {
          const success = cancelBooking(bookingId);
          if (success) {
            Taro.showToast({ title: '已取消', icon: 'success' });
          } else {
            Taro.showToast({ title: '取消失败', icon: 'none' });
          }
        }
      }
    });
  };

  const handleCheckIn = (bookingId: string) => {
    const success = checkInBooking(bookingId);
    if (success) {
      Taro.showToast({ title: '已入场', icon: 'success' });
    }
  };

  const handleCheckOut = (bookingId: string) => {
    Taro.showModal({
      title: '确认离场',
      content: '客人已离场并结算费用？',
      success: (res) => {
        if (res.confirm) {
          const success = checkOutBooking(bookingId);
          if (success) {
            Taro.showToast({ title: '已完成', icon: 'success' });
          }
        }
      }
    });
  };

  const goToBooking = () => {
    Taro.switchTab({ url: '/pages/booking/index' });
  };

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.header}>
        <View className={styles.headerTitle}>📋 我的订单</View>
        <View className={styles.headerSubtitle}>查看和管理您的所有预订</View>
      </View>

      <ScrollView className={styles.tabs} scrollX>
        {TABS.map(tab => (
          <View
            key={tab.key}
            className={classnames(styles.tab, {
              [styles.tabActive]: activeTab === tab.key
            })}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </View>
        ))}
      </ScrollView>

      {filteredBookings.length === 0 ? (
        <View className={styles.emptyState}>
          <View className={styles.emptyStateIcon}>🎤</View>
          <View className={styles.emptyStateText}>暂无订单记录</View>
          <GradientButton onClick={goToBooking}>去预订</GradientButton>
        </View>
      ) : (
        filteredBookings.map(booking => (
          <OrderCard
            key={booking.id}
            booking={booking}
            onExtend={() => handleExtend(booking.id)}
            onCancel={() => handleCancel(booking.id)}
            onCheckIn={() => handleCheckIn(booking.id)}
            onCheckOut={() => handleCheckOut(booking.id)}
          />
        ))
      )}

      {showExtendModal && (
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
          onClick={() => setShowExtendModal(false)}
        >
          <View className={styles.extendModal} onClick={(e) => e.stopPropagation()}>
            <View className={styles.extendModalTitle}>续钟时间</View>

            <View className={styles.hourOptions}>
              {[1, 2, 3, 4].map(h => (
                <View
                  key={h}
                  className={classnames(styles.hourOption, {
                    [styles.hourOptionActive]: selectedHours === h
                  })}
                  onClick={() => setSelectedHours(h)}
                >
                  <View className={styles.hourOptionHours}>{h}h</View>
                  <View className={styles.hourOptionPrice}>¥{extendPrice * h / selectedHours}</View>
                </View>
              ))}
            </View>

            <View className={styles.extendTotal}>
              <View className={styles.extendTotalLabel}>续钟费用</View>
              <View className={styles.extendTotalValue}>¥{extendPrice}</View>
            </View>

            <View className={styles.extendActions}>
              <GradientButton
                block
                ghost
                onClick={() => setShowExtendModal(false)}
              >
                取消
              </GradientButton>
              <GradientButton block onClick={confirmExtend}>
                确认续钟
              </GradientButton>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default OrdersPage;
