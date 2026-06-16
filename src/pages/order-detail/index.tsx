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
.extend-modal, .modify-modal {
  background: #1E1E3A;
  border-radius: 24rpx;
  padding: 48rpx;
  margin: 48rpx;
  max-width: 680rpx;
  max-height: 80vh;
  overflow-y: auto;
}
.extend-modal-title, .modify-modal-title {
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
.extend-actions, .modify-actions {
  display: flex;
  gap: 24rpx;
}
.modify-field {
  margin-bottom: 28rpx;
}
.modify-field-label {
  color: #8E8EB2;
  font-size: 26rpx;
  margin-bottom: 12rpx;
}
.modify-field-value {
  color: #FFFFFF;
  font-size: 30rpx;
  padding: 20rpx 24rpx;
  background: rgba(123,47,253,0.08);
  border-radius: 12rpx;
  border: 2rpx solid rgba(255,255,255,0.08);
}
.modify-duration-options {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}
.modify-duration-option {
  padding: 16rpx 24rpx;
  border-radius: 12rpx;
  background: rgba(123,47,253,0.08);
  border: 2rpx solid rgba(255,255,255,0.08);
  color: #fff;
  font-size: 26rpx;
}
.modify-duration-option-active {
  background: linear-gradient(135deg, rgba(123,47,253,0.4) 0%, rgba(255,61,138,0.4) 100%);
  border-color: #FFD700;
}
.modify-pkg-option {
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
  background: rgba(123,47,253,0.08);
  border: 2rpx solid rgba(255,255,255,0.08);
  margin-bottom: 12rpx;
  color: #fff;
}
.modify-pkg-option-active {
  background: linear-gradient(135deg, rgba(123,47,253,0.4) 0%, rgba(255,61,138,0.4) 100%);
  border-color: #FFD700;
}
.modify-pkg-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}
.modify-pkg-price {
  font-size: 24rpx;
  color: #FFD700;
  margin-top: 4rpx;
}
.modify-summary {
  padding: 24rpx;
  background: rgba(123,47,253,0.1);
  border-radius: 12rpx;
  margin-bottom: 24rpx;
}
.modify-summary-row {
  display: flex;
  justify-content: space-between;
  color: #fff;
  font-size: 26rpx;
  padding: 6rpx 0;
}
.modify-summary-hl {
  color: #FFD700;
  font-weight: 700;
  font-size: 32rpx;
}
`;

const OrderDetailPage: React.FC = () => {
  const router = useRouter();
  const bookingId = router.params.id || '';
  const { getBookingById, extendBooking, cancelBooking, checkInBooking, checkOutBooking, modifyBooking } = useBookingStore();
  const { packages, getPackageById } = usePackageStore();
  const { counters } = useQueueStore();
  const { getRoomById, rooms, schedules } = useRoomStore();

  const [showExtend, setShowExtend] = useState(false);
  const [extendHours, setExtendHours] = useState(1);
  const [showModify, setShowModify] = useState(false);

  const booking = useMemo(() => getBookingById(bookingId), [bookingId, getBookingById]);

  const [modifyState, setModifyState] = useState({
    peopleCount: booking?.peopleCount || 2,
    date: booking?.date || '',
    startTime: booking?.startTime || '18:00',
    duration: booking?.duration || 4,
    packageIds: booking?.packageIds || [] as string[]
  });

  React.useEffect(() => {
    if (booking) {
      setModifyState({
        peopleCount: booking.peopleCount,
        date: booking.date,
        startTime: booking.startTime,
        duration: booking.duration,
        packageIds: [...booking.packageIds]
      });
    }
  }, [booking, showModify]);

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
  const canModify = booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'extended';

  const modifyPreview = useMemo(() => {
    if (!booking) return null;
    const pkgTotal = modifyState.packageIds.reduce((sum, id) => {
      const p = getPackageById(id);
      return sum + (p?.discountPrice || 0);
    }, 0);
    const room = getRoomById(booking.roomId);
    const base = (room?.hourlyRate || 0) * modifyState.duration;
    return {
      baseAmount: base,
      packageAmount: pkgTotal,
      extendAmount: booking.extendAmount || 0,
      totalAmount: base + pkgTotal + (booking.extendAmount || 0)
    };
  }, [modifyState, booking, getPackageById, getRoomById]);

  const togglePackage = (pkgId: string) => {
    setModifyState(s => {
      const has = s.packageIds.includes(pkgId);
      return { ...s, packageIds: has ? s.packageIds.filter(x => x !== pkgId) : [...s.packageIds, pkgId] };
    });
  };

  const handleModify = async () => {
    if (!booking) return;
    const res = await modifyBooking(bookingId, {
      peopleCount: modifyState.peopleCount,
      date: modifyState.date,
      startTime: modifyState.startTime,
      duration: modifyState.duration,
      packageIds: [...modifyState.packageIds]
    });
    if (res.success) {
      Taro.showToast({ title: '修改成功', icon: 'success' });
      setShowModify(false);
    } else {
      Taro.showToast({ title: res.error || '修改失败', icon: 'none' });
    }
  };

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

      {(canExtend || canCancel || canCheckIn || canCheckOut || canModify) && (
        <View className={styles.bottomBar}>
          {canModify && (
            <GradientButton block variant="cyan" onClick={() => setShowModify(true)}>
              修改预订
            </GradientButton>
          )}
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

      {showModify && booking && modifyPreview && (
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
              zIndex: 1001
            }}
            onClick={() => setShowModify(false)}
          >
            <View className="modify-modal" onClick={(e) => e.stopPropagation()}>
              <View className="modify-modal-title">修改预订</View>

              <View className="modify-field">
                <View className="modify-field-label">人数</View>
                <View className="modify-field-value" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <GradientButton size="small" ghost onClick={() => setModifyState(s => ({ ...s, peopleCount: Math.max(1, s.peopleCount - 1) }))}>-</GradientButton>
                  <Text style={{ minWidth: 60, textAlign: 'center', fontSize: 32, fontWeight: 700 }}>{modifyState.peopleCount}人</Text>
                  <GradientButton size="small" ghost onClick={() => setModifyState(s => ({ ...s, peopleCount: Math.min(40, s.peopleCount + 1) }))}>+</GradientButton>
                </View>
              </View>

              <View className="modify-field">
                <View className="modify-field-label">日期</View>
                <View className="modify-field-value" onClick={() => {
                  Taro.showActionSheet({
                    itemList: [
                      '今天', '明天', '后天'
                    ],
                    success: (res) => {
                      const today = new Date();
                      if (res.tapIndex === 0) setModifyState(s => ({ ...s, date: today.toISOString().slice(0, 10) }));
                      if (res.tapIndex === 1) {
                        const d = new Date(today.getTime() + 86400000);
                        setModifyState(s => ({ ...s, date: d.toISOString().slice(0, 10) }));
                      }
                      if (res.tapIndex === 2) {
                        const d = new Date(today.getTime() + 86400000 * 2);
                        setModifyState(s => ({ ...s, date: d.toISOString().slice(0, 10) }));
                      }
                    }
                  });
                }}>{modifyState.date}</View>
              </View>

              <View className="modify-field">
                <View className="modify-field-label">开始时间</View>
                <View className="modify-duration-options">
                  {['12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '00:00'].map(t => (
                    <View
                      key={t}
                      className={classnames('modify-duration-option', {
                        'modify-duration-option-active': modifyState.startTime === t
                      })}
                      onClick={() => setModifyState(s => ({ ...s, startTime: t }))}
                    >{t}</View>
                  ))}
                </View>
              </View>

              <View className="modify-field">
                <View className="modify-field-label">时长（小时）</View>
                <View className="modify-duration-options">
                  {[2, 3, 4, 5, 6, 8].map(h => (
                    <View
                      key={h}
                      className={classnames('modify-duration-option', {
                        'modify-duration-option-active': modifyState.duration === h
                      })}
                      onClick={() => setModifyState(s => ({ ...s, duration: h }))}
                    >{h}h</View>
                  ))}
                </View>
              </View>

              <View className="modify-field">
                <View className="modify-field-label">酒水套餐</View>
                {packages.map(pkg => (
                  <View
                    key={pkg.id}
                    className={classnames('modify-pkg-option', {
                      'modify-pkg-option-active': modifyState.packageIds.includes(pkg.id)
                    })}
                    onClick={() => togglePackage(pkg.id)}
                  >
                    <View className="modify-pkg-name">{pkg.name}</View>
                    <View className="modify-pkg-price">¥{pkg.discountPrice}（原价¥{pkg.originalPrice}）</View>
                  </View>
                ))}
              </View>

              <View className="modify-summary">
                <View className="modify-summary-row">
                  <Text>包厢费</Text>
                  <Text>¥{modifyPreview.baseAmount}</Text>
                </View>
                <View className="modify-summary-row">
                  <Text>套餐费</Text>
                  <Text>¥{modifyPreview.packageAmount}</Text>
                </View>
                {modifyPreview.extendAmount > 0 && (
                  <View className="modify-summary-row">
                    <Text>已续钟</Text>
                    <Text>¥{modifyPreview.extendAmount}</Text>
                  </View>
                )}
                <View className="modify-summary-row" style={{ marginTop: 12, paddingTop: 12, borderTop: '2rpx dashed rgba(255,255,255,0.1)' }}>
                  <Text>预计总价</Text>
                  <Text className="modify-summary-hl">¥{modifyPreview.totalAmount}</Text>
                </View>
              </View>

              <View className="modify-actions">
                <GradientButton block ghost onClick={() => setShowModify(false)}>
                  取消
                </GradientButton>
                <GradientButton block onClick={handleModify}>
                  确认修改
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
