import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import OrderCard from '../../components/OrderCard';
import GradientButton from '../../components/GradientButton';
import { useBookingStore } from '../../store/useBookingStore';
import { useRoomStore } from '../../store/useRoomStore';
import { usePackageStore } from '../../store/usePackageStore';
import { useQueueStore } from '../../store/useQueueStore';
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

const ORDER_BATCH_STYLES = `
.batch-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 32rpx;
  background: linear-gradient(135deg, rgba(123,47,253,0.2) 0%, rgba(255,61,138,0.2) 100%);
  border-top: 2rpx solid rgba(255,215,0,0.3);
  border-bottom: 2rpx solid rgba(255,215,0,0.3);
  gap: 16rpx;
}
.batch-info {
  flex: 1;
  color: #fff;
  font-size: 26rpx;
}
.batch-count {
  color: #FFD700;
  font-weight: 700;
}
.batch-actions {
  display: flex;
  gap: 12rpx;
}
.batch-toggle-btn {
  color: #8E8EB2;
  font-size: 24rpx;
  padding: 10rpx 20rpx;
  margin-right: 16rpx;
}
.batch-toggle-btn-active {
  color: #FFD700 !important;
  font-weight: 600;
}
`;

const ORDERS_MODIFY_STYLES = `
.modify-modal {
  background: #1E1E3A;
  border-radius: 24rpx;
  padding: 48rpx;
  margin: 48rpx;
  max-width: 680rpx;
  max-height: 80vh;
  overflow-y: auto;
}
.modify-modal-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #FFFFFF;
  text-align: center;
  margin-bottom: 32rpx;
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
.modify-actions {
  display: flex;
  gap: 24rpx;
}
`;

const OrdersPage: React.FC = () => {
  const { bookings, extendBooking, cancelBooking, checkInBooking, checkOutBooking, modifyBooking } = useBookingStore();
  const { getRoomById } = useRoomStore();
  const { packages, getPackageById } = usePackageStore();
  const { addToQueue } = useQueueStore();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendBookingId, setExtendBookingId] = useState<string | null>(null);
  const [selectedHours, setSelectedHours] = useState(1);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modifyBookingId, setModifyBookingId] = useState<string | null>(null);
  const [modifyState, setModifyState] = useState({
    peopleCount: 2,
    date: '',
    startTime: '18:00',
    duration: 4,
    packageIds: [] as string[]
  });

  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredBookings = useMemo(() => {
    if (activeTab === 'all') return bookings;
    return bookings.filter(b => b.status === activeTab);
  }, [bookings, activeTab]);

  const selectableBookings = useMemo(
    () => filteredBookings.filter(b => b.status === 'pending' || b.status === 'confirmed'),
    [filteredBookings]
  );

  const allSelectableSelected = useMemo(() => {
    if (selectableBookings.length === 0) return false;
    return selectableBookings.every(b => selectedIds.has(b.id));
  }, [selectableBookings, selectedIds]);

  const selectedBookings = useMemo(
    () => bookings.filter(b => selectedIds.has(b.id)),
    [bookings, selectedIds]
  );

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableBookings.map(b => b.id)));
    }
  };

  const exitBatchMode = () => {
    setBatchMode(false);
    setSelectedIds(new Set());
  };

  const handleBatchCancel = () => {
    if (selectedBookings.length === 0) return;
    Taro.showModal({
      title: '批量取消',
      content: `确认取消已选中的 ${selectedBookings.length} 个订单？`,
      success: (res) => {
        if (res.confirm) {
          let successCount = 0;
          for (const b of selectedBookings) {
            if (cancelBooking(b.id)) successCount++;
          }
          Taro.showToast({ title: `已取消 ${successCount} 个`, icon: 'success' });
          exitBatchMode();
        }
      }
    });
  };

  const handleBatchToQueue = () => {
    if (selectedBookings.length === 0) return;
    Taro.showModal({
      title: '批量转前台队列',
      content: `将已选中的 ${selectedBookings.length} 个待确认订单转入前台叫号？`,
      success: (res) => {
        if (res.confirm) {
          let addedCount = 0;
          for (const b of selectedBookings) {
            const ok = addToQueue({
              roomType: b.roomType,
              peopleCount: b.peopleCount,
              customerName: b.customerName,
              customerPhone: b.customerPhone,
              isVip: false
            });
            if (ok) addedCount++;
          }
          Taro.showToast({ title: `已加入 ${addedCount} 个`, icon: 'success' });
          exitBatchMode();
        }
      }
    });
  };

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

  const handleModify = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    setModifyBookingId(bookingId);
    setModifyState({
      peopleCount: booking.peopleCount,
      date: booking.date,
      startTime: booking.startTime,
      duration: booking.duration,
      packageIds: [...booking.packageIds]
    });
    setShowModifyModal(true);
  };

  const modifyPreview = useMemo(() => {
    if (!modifyBookingId) return null;
    const booking = bookings.find(b => b.id === modifyBookingId);
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
  }, [modifyBookingId, modifyState, bookings, getPackageById, getRoomById]);

  const togglePackage = (pkgId: string) => {
    setModifyState(s => {
      const has = s.packageIds.includes(pkgId);
      return { ...s, packageIds: has ? s.packageIds.filter(x => x !== pkgId) : [...s.packageIds, pkgId] };
    });
  };

  const confirmModify = async () => {
    if (!modifyBookingId) return;
    const res = await modifyBooking(modifyBookingId, {
      peopleCount: modifyState.peopleCount,
      date: modifyState.date,
      startTime: modifyState.startTime,
      duration: modifyState.duration,
      packageIds: [...modifyState.packageIds]
    });
    if (res.success) {
      Taro.showToast({ title: '修改成功', icon: 'success' });
      setShowModifyModal(false);
      setModifyBookingId(null);
    } else {
      Taro.showToast({ title: res.error || '修改失败', icon: 'none' });
    }
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
        <View
          className={classnames('batch-toggle-btn', { 'batch-toggle-btn-active': batchMode })}
          onClick={() => { if (batchMode) exitBatchMode(); else setBatchMode(true); }}
          style={{
            marginLeft: 'auto',
            color: batchMode ? '#FFD700' : '#8E8EB2',
            fontSize: 24,
            padding: '8rpx 20rpx',
            alignSelf: 'center',
            fontWeight: batchMode ? 700 : 400
          }}
        >{batchMode ? '退出多选' : '批量操作'}</View>
      </ScrollView>

      <style>{ORDER_BATCH_STYLES}</style>
      {batchMode && (
        <View className="batch-bar">
          <View
            onClick={toggleSelectAll}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '3rpx solid ' + (allSelectableSelected ? '#FFD700' : 'rgba(255,255,255,0.3)'),
              background: allSelectableSelected ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' : 'rgba(255,255,255,0.04)',
              color: allSelectableSelected ? '#1E1E3A' : 'transparent',
              textAlign: 'center', lineHeight: '40rpx',
              fontSize: 24, fontWeight: 800, flexShrink: 0
            }}
          >{allSelectableSelected ? '✓' : ''}</View>
          <View className="batch-info">
            {allSelectableSelected ? '已全选' : '全选'} · 可批量操作 <Text className="batch-count">{selectableBookings.length}</Text> 个待确认/已确认订单 · 已选 <Text className="batch-count">{selectedIds.size}</Text>
          </View>
        </View>
      )}

      {filteredBookings.length === 0 ? (
        <View className={styles.emptyState}>
          <View className={styles.emptyStateIcon}>🎤</View>
          <View className={styles.emptyStateText}>暂无订单记录</View>
          <GradientButton onClick={goToBooking}>去预订</GradientButton>
        </View>
      ) : (
        filteredBookings.map(booking => {
          const selectable = booking.status === 'pending' || booking.status === 'confirmed';
          return (
            <OrderCard
              key={booking.id}
              booking={booking}
              onExtend={() => handleExtend(booking.id)}
              onCancel={() => handleCancel(booking.id)}
              onCheckIn={() => handleCheckIn(booking.id)}
              onCheckOut={() => handleCheckOut(booking.id)}
              onModify={() => handleModify(booking.id)}
              batchMode={batchMode}
              selected={selectedIds.has(booking.id)}
              selectable={selectable}
              onToggleSelect={() => toggleSelectOne(booking.id)}
            />
          );
        })
      )}

      {batchMode && selectedIds.size > 0 && (
        <View style={{
          position: 'sticky', bottom: 0, zIndex: 100,
          background: 'rgba(30,30,58,0.97)',
          borderTop: '2rpx solid rgba(255,215,0,0.4)',
          padding: '20rpx 32rpx', paddingBottom: 40,
          display: 'flex', gap: 16
        }}>
          <GradientButton ghost block onClick={handleBatchCancel}>批量取消（{selectedIds.size}）</GradientButton>
          <GradientButton block onClick={handleBatchToQueue}>批量转队列（{selectedIds.size}）</GradientButton>
        </View>
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

      {showModifyModal && modifyBookingId && modifyPreview && (
        <>
          <style>{ORDERS_MODIFY_STYLES}</style>
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
            onClick={() => setShowModifyModal(false)}
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
                <GradientButton block ghost onClick={() => { setShowModifyModal(false); setModifyBookingId(null); }}>
                  取消
                </GradientButton>
                <GradientButton block onClick={confirmModify}>
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

export default OrdersPage;
