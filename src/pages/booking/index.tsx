import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import GradientButton from '../../components/GradientButton';
import TimeSlotPicker from '../../components/TimeSlotPicker';
import { useRoomStore } from '../../store/useRoomStore';
import { useBookingStore } from '../../store/useBookingStore';
import { usePackageStore } from '../../store/usePackageStore';
import { findBestRoom } from '../../utils/roomAllocator';
import { getToday, addHours } from '../../utils/timeUtils';
import type { RoomType } from '../../types/room';
import { ROOM_TYPE_LABEL } from '../../types/room';
import styles from './index.module.scss';

const ROOM_TYPES: RoomType[] = ['small', 'medium', 'large', 'vip', 'luxury'];

const BookingPage: React.FC = () => {
  const { rooms, schedules } = useRoomStore();
  const { createBooking, selectedPackages, calculatePackageTotal, clearSelectedPackages } = useBookingStore();
  const { getFilteredPackages } = usePackageStore();

  const [peopleCount, setPeopleCount] = useState(4);
  const [preferredType, setPreferredType] = useState<RoomType | undefined>();
  const [selectedDate] = useState(getToday());
  const [selectedTime, setSelectedTime] = useState('18:00');
  const [selectedDuration, setSelectedDuration] = useState(2);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const suggestedRoom = useMemo(() => {
    const endTime = addHours(selectedTime, selectedDuration);
    const result = findBestRoom(rooms, schedules, peopleCount, selectedDate, selectedTime, endTime, preferredType);
    return result.success ? result.room : undefined;
  }, [rooms, schedules, peopleCount, selectedDate, selectedTime, selectedDuration, preferredType]);

  const totalBaseAmount = useMemo(() => {
    return suggestedRoom ? suggestedRoom.hourlyRate * selectedDuration : 0;
  }, [suggestedRoom, selectedDuration]);

  const packageAmount = useMemo(() => calculatePackageTotal(), [calculatePackageTotal, selectedPackages]);

  const totalAmount = totalBaseAmount + packageAmount;

  const selectedPackageCount = useMemo(() => {
    return selectedPackages.reduce((sum, p) => sum + p.quantity, 0);
  }, [selectedPackages]);

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      Taro.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    if (!customerPhone.trim()) {
      Taro.showToast({ title: '请输入手机号', icon: 'none' });
      return;
    }
    if (!suggestedRoom) {
      Taro.showToast({ title: '暂无可用包厢', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      const packageIds = selectedPackages.flatMap(p =>
        Array(p.quantity).fill(p.packageId)
      );

      const result = await createBooking({
        peopleCount,
        preferredRoomType: preferredType,
        date: selectedDate,
        startTime: selectedTime,
        duration: selectedDuration,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        packageIds
      });

      if (result.success) {
        Taro.showToast({ title: '预订成功', icon: 'success' });
        clearSelectedPackages();
        setTimeout(() => {
          Taro.switchTab({ url: '/pages/orders/index' });
        }, 1500);
      } else {
        Taro.showToast({ title: result.error || '预订失败', icon: 'none' });
      }
    } catch (error) {
      console.error('[BookingPage] 提交失败', error);
      Taro.showToast({ title: '系统错误', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  const goToPackages = () => {
    Taro.navigateTo({ url: '/pages/packages/index?from=booking' });
  };

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.header}>
        <View className={styles.headerTitle}>🎤 快速预订</View>
        <View className={styles.headerSubtitle}>智能分配最优包厢，避免时间碎片</View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>人数选择</View>
        <View className={styles.peopleSelector}>
          <Text className={styles.peopleLabel}>预订人数</Text>
          <View className={styles.peopleControl}>
            <View
              className={styles.peopleBtn}
              onClick={() => setPeopleCount(Math.max(1, peopleCount - 1))}
            >
              -
            </View>
            <Text className={styles.peopleValue}>{peopleCount}</Text>
            <View
              className={styles.peopleBtn}
              onClick={() => setPeopleCount(Math.min(40, peopleCount + 1))}
            >
              +
            </View>
          </View>
        </View>

        <View className={styles.sectionTitle} style={{ marginTop: 16 }}>房型偏好（可选）</View>
        <View className={styles.roomTypes}>
          <View
            className={classnames(styles.roomTypeBtn, {
              [styles.roomTypeBtnSelected]: !preferredType
            })}
            onClick={() => setPreferredType(undefined)}
          >
            智能推荐
          </View>
          {ROOM_TYPES.map(type => (
            <View
              key={type}
              className={classnames(styles.roomTypeBtn, {
                [styles.roomTypeBtnSelected]: preferredType === type
              })}
              onClick={() => setPreferredType(type)}
            >
              {ROOM_TYPE_LABEL[type]}
            </View>
          ))}
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>时间选择</View>
        <TimeSlotPicker
          selectedTime={selectedTime}
          onTimeChange={setSelectedTime}
          selectedDuration={selectedDuration}
          onDurationChange={setSelectedDuration}
        />

        {suggestedRoom && (
          <View className={styles.suggestedRoom}>
            <View className={styles.suggestedRoomTitle}>✨ 系统为您智能分配</View>
            <View className={styles.suggestedRoomName}>
              {suggestedRoom.name} · {suggestedRoom.roomNo}
            </View>
            <View className={styles.suggestedRoomDesc}>
              {ROOM_TYPE_LABEL[suggestedRoom.type]} · 容纳{suggestedRoom.capacity}人 · ¥{suggestedRoom.hourlyRate}/小时
            </View>
          </View>
        )}
      </View>

      <View className={styles.section}>
        <View className={styles.sectionTitle}>联系信息</View>
        <View className={styles.inputField}>
          <View className={styles.inputFieldLabel}>姓名</View>
          <Input
            className={styles.inputFieldInput}
            placeholder="请输入您的姓名"
            value={customerName}
            onInput={(e) => setCustomerName(e.detail.value)}
          />
        </View>
        <View className={styles.inputField}>
          <View className={styles.inputFieldLabel}>手机号</View>
          <Input
            className={styles.inputFieldInput}
            type="number"
            placeholder="请输入手机号码"
            value={customerPhone}
            onInput={(e) => setCustomerPhone(e.detail.value)}
            maxlength={11}
          />
        </View>

        <View className={styles.selectedPackages}>
          <View className={styles.packageSummary}>
            <Text className={styles.packageSummaryLabel}>
              酒水套餐 {selectedPackageCount > 0 ? `(已选${selectedPackageCount}份)` : ''}
            </Text>
            <Text className={styles.packageSummaryAction} onClick={goToPackages}>
              {selectedPackageCount > 0 ? '修改' : '选择套餐'} →
            </Text>
          </View>
        </View>
      </View>

      <View className={styles.bottomBar}>
        <View className={styles.priceInfo}>
          <View className={styles.priceInfoLabel}>预计支付</View>
          <View className={styles.priceInfoValue}>¥{totalAmount}</View>
        </View>
        <GradientButton
          size="large"
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={submitting || !suggestedRoom}
        >
          {submitting ? '提交中...' : '立即预订'}
        </GradientButton>
      </View>
    </ScrollView>
  );
};

export default BookingPage;
