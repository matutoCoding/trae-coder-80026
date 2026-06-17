import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import QueueCounter from '../../components/QueueCounter';
import GradientButton from '../../components/GradientButton';
import { useQueueStore } from '../../store/useQueueStore';
import { useBookingStore } from '../../store/useBookingStore';
import type { QueueStatus } from '../../types/queue';
import { QUEUE_STATUS_LABEL } from '../../types/queue';
import { ROOM_TYPE_LABEL as RoomLabels } from '../../types/room';
import type { Counter } from '../../types/queue';
import { formatDateTime } from '../../utils/timeUtils';
import styles from './index.module.scss';

const QUEUE_UI_STYLES = `
.transfer-modal, .priority-modal {
  background: #1E1E3A;
  border-radius: 24rpx;
  padding: 40rpx;
  margin: 40rpx;
  min-width: 500rpx;
  max-width: 640rpx;
}
.modal-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #fff;
  text-align: center;
  margin-bottom: 32rpx;
}
.modal-subtitle {
  font-size: 26rpx;
  color: #8E8EB2;
  margin-bottom: 20rpx;
  margin-top: 16rpx;
}
.counter-option {
  padding: 28rpx 24rpx;
  border-radius: 16rpx;
  background: rgba(123,47,253,0.1);
  border: 2rpx solid rgba(255,255,255,0.08);
  margin-bottom: 16rpx;
  color: #fff;
  font-size: 28rpx;
}
.counter-option-online {
  border-color: rgba(123,47,253,0.5);
}
.counter-option-active {
  background: linear-gradient(135deg, rgba(123,47,253,0.35) 0%, rgba(255,61,138,0.35) 100%);
  border-color: #FFD700;
}
.modal-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 32rpx;
}
.vip-tag {
  display: inline-block;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: #1E1E3A;
  font-size: 20rpx;
  font-weight: 700;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  margin-left: 8rpx;
  vertical-align: middle;
}
.reason-tag {
  display: inline-block;
  background: rgba(255, 215, 0, 0.15);
  color: #FFD700;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  margin-left: 8rpx;
  border: 2rpx solid rgba(255, 215, 0, 0.4);
  vertical-align: middle;
}
.reason-options {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}
.reason-option {
  padding: 16rpx 24rpx;
  border-radius: 12rpx;
  background: rgba(123,47,253,0.08);
  border: 2rpx solid rgba(255,255,255,0.08);
  color: #fff;
  font-size: 26rpx;
}
.reason-option-active {
  background: linear-gradient(135deg, rgba(123,47,253,0.4) 0%, rgba(255,61,138,0.4) 100%);
  border-color: #FFD700;
}
.missed-count-tag {
  display: inline-block;
  background: rgba(130,130,160,0.2);
  color: #B0B0D0;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  margin-left: 8rpx;
  border: 2rpx dashed rgba(130,130,160,0.5);
  vertical-align: middle;
}
`;

type TabType = 'all' | 'waiting' | 'calling' | 'served' | 'missed';

const QueuePage: React.FC = () => {
  const { counters, queueItems, callNext, markServed, markMissed, recallMissed, requeueToTail, triggerRebalance, getCountersLoad, transferToCounter, moveToFront } = useQueueStore();
  const { checkInBooking } = useBookingStore();
  const [activeTab, setActiveTab] = useState<TabType>('waiting');
  const [showTransfer, setShowTransfer] = useState<string | null>(null);
  const [showPriority, setShowPriority] = useState<string | null>(null);
  const [priorityCounterId, setPriorityCounterId] = useState<string>('');
  const [priorityReason, setPriorityReason] = useState<string>('VIP客户');

  const overview = useMemo(() => {
    return {
      waiting: queueItems.filter(q => q.status === 'waiting').length,
      calling: queueItems.filter(q => q.status === 'calling').length,
      served: queueItems.filter(q => q.status === 'served').length,
      missed: queueItems.filter(q => q.status === 'missed').length
    };
  }, [queueItems]);

  const counterLoads = useMemo(() => getCountersLoad(), [getCountersLoad, counters, queueItems]);

  const filteredQueue = useMemo(() => {
    let items = queueItems;
    if (activeTab !== 'all') {
      items = queueItems.filter(q => q.status === activeTab);
    }
    return items.sort((a, b) => {
      const prioDiff = (b.priority || 0) - (a.priority || 0);
      if (prioDiff !== 0) return prioDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [queueItems, activeTab]);

  const getCounterLoadPercent = (counterId: string): number => {
    const load = counterLoads.find(l => l.counterId === counterId);
    if (!load) return 0;
    const maxLoad = Math.max(...counterLoads.map(l => l.loadScore), 1);
    return (load.loadScore / maxLoad) * 100;
  };

  const getCounterName = (counterId?: string): string => {
    if (!counterId) return '-';
    const counter = counters.find(c => c.id === counterId);
    return counter?.name || '-';
  };

  const handleCallNext = (counterId: string) => {
    const item = callNext(counterId);
    if (item) {
      Taro.showToast({ title: `叫号: ${item.queueNo}`, icon: 'none' });
    } else {
      Taro.showToast({ title: '暂无等待客人', icon: 'none' });
    }
  };

  const handleServed = (queueItemId: string) => {
    Taro.showModal({
      title: '确认服务',
      content: '确认该客人已完成服务并安排入场？',
      success: (res) => {
        if (res.confirm) {
          const item = queueItems.find(q => q.id === queueItemId);
          markServed(queueItemId, item?.bookingId || '');
          if (item?.bookingId) {
            checkInBooking(item.bookingId);
          }
          Taro.showToast({ title: '已完成服务', icon: 'success' });
        }
      }
    });
  };

  const handleMissed = (queueItemId: string) => {
    Taro.showModal({
      title: '标记过号',
      content: '确认该客人已过号？',
      success: (res) => {
        if (res.confirm) {
          markMissed(queueItemId);
          Taro.showToast({ title: '已标记过号', icon: 'none' });
        }
      }
    });
  };

  const handleRecallMissed = (queueItemId: string) => {
    const ok = recallMissed(queueItemId);
    if (ok) {
      Taro.showToast({ title: '已重新叫号', icon: 'success' });
    } else {
      Taro.showToast({ title: '重叫失败', icon: 'none' });
    }
  };

  const handleRequeueToTail = (queueItemId: string) => {
    Taro.showModal({
      title: '放回队尾',
      content: '确认将该客人放回原窗口队尾重新排队？',
      success: (res) => {
        if (res.confirm) {
          const ok = requeueToTail(queueItemId);
          if (ok) {
            Taro.showToast({ title: '已放回队尾', icon: 'success' });
          } else {
            Taro.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  };

  const handleRebalance = () => {
    triggerRebalance();
    Taro.showToast({ title: '负载均衡已执行', icon: 'success' });
  };

  const handleTransfer = (queueItemId: string, targetCounterId: string) => {
    const ok = transferToCounter(queueItemId, targetCounterId);
    if (ok) {
      Taro.showToast({ title: '转窗口成功', icon: 'success' });
    } else {
      Taro.showToast({ title: '转窗口失败', icon: 'none' });
    }
    setShowTransfer(null);
  };

  const handleInsertFront = (queueItemId: string) => {
    const item = queueItems.find(q => q.id === queueItemId);
    setPriorityCounterId(item?.counterId || '');
    setPriorityReason('VIP客户');
    setShowPriority(queueItemId);
  };

  const confirmInsertFront = () => {
    if (!showPriority) return;
    const ok = moveToFront(showPriority, {
      targetCounterId: priorityCounterId || undefined,
      reason: priorityReason
    });
    if (ok) {
      Taro.showToast({ title: '已插队到队首', icon: 'success' });
    } else {
      Taro.showToast({ title: '操作失败', icon: 'none' });
    }
    setShowPriority(null);
  };

  const TransferModal = () => {
    if (!showTransfer) return null;
    const item = queueItems.find(q => q.id === showTransfer);
    if (!item) return null;
    const availableCounters = counters.filter(c => c.status !== 'offline' && c.id !== item.counterId);
    return (
      <View style={
        {
          position: 'fixed', left: 0, right: 0, top: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }
      }
        onClick={() => setShowTransfer(null)}
      >
        <View className="transfer-modal" onClick={e => e.stopPropagation()}>
          <View className="modal-title">
            转窗口：{item.customerName}（{item.queueNo}）
          </View>
          <style>{QUEUE_UI_STYLES}</style>
          <View>
            {availableCounters.length === 0 && (
              <View style={{ color: '#6E6E91', textAlign: 'center', padding: '32rpx 0' }}>暂无可用窗口</View>
            )}
            {availableCounters.map(c => (
              <View
                key={c.id}
                className="counter-option counter-option-online"
                onClick={() => handleTransfer(item.id, c.id)}
              >
                {c.name} ｜等待 {c.waitingQueueCount}｜服务中 {c.currentServingCount}
              </View>
            ))}
          </View>
          <View className="modal-actions">
            <GradientButton size="small" ghost onClick={() => setShowTransfer(null)}>取消</GradientButton>
          </View>
        </View>
      </View>
    );
  };

  const PriorityModal = () => {
    if (!showPriority) return null;
    const item = queueItems.find(q => q.id === showPriority);
    if (!item) return null;
    const availableCounters = counters.filter(c => c.status !== 'offline');
    const reasonOptions = ['VIP客户', '长辈优先', '包场客户', '特殊情况', '熟客优先', '其他'];
    return (
      <View style={
        {
          position: 'fixed', left: 0, right: 0, top: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }
      }
        onClick={() => setShowPriority(null)}
      >
        <View className="priority-modal" onClick={e => e.stopPropagation()}>
          <style>{QUEUE_UI_STYLES}</style>
          <View className="modal-title">插队处理：{item.customerName}（{item.queueNo}）</View>

          <View className="modal-subtitle">选择目标窗口</View>
          <View>
            {availableCounters.map(c => (
              <View
                key={c.id}
                className={classnames('counter-option', 'counter-option-online', {
                  'counter-option-active': (priorityCounterId || item.counterId) === c.id
                })}
                onClick={() => setPriorityCounterId(c.id)}
              >
                {c.name} ｜等待 {c.waitingQueueCount}｜服务中 {c.currentServingCount}
              </View>
            ))}
          </View>

          <View className="modal-subtitle">插队原因</View>
          <View className="reason-options">
            {reasonOptions.map(r => (
              <View
                key={r}
                className={classnames('reason-option', { 'reason-option-active': priorityReason === r })}
                onClick={() => setPriorityReason(r)}
              >{r}</View>
            ))}
          </View>

          <View className="modal-actions">
            <GradientButton block ghost onClick={() => setShowPriority(null)}>取消</GradientButton>
            <GradientButton block onClick={confirmInsertFront}>确认插队</GradientButton>
          </View>
        </View>
      </View>
    );
  };

  const getStatusClass = (status: QueueStatus) => ({
    waiting: styles.statusWaiting,
    calling: styles.statusCalling,
    served: styles.statusServed,
    missed: styles.statusMissed,
    cancelled: styles.statusMissed
  }[status] || styles.statusWaiting);

  const getQueueNoClass = (status: QueueStatus) => ({
    waiting: '',
    calling: styles.queueNoCalling,
    served: styles.queueNoServed,
    missed: styles.queueNoMissed,
    cancelled: styles.queueNoMissed
  }[status] || '');

  const tabs: { key: TabType; label: string }[] = [
    { key: 'waiting', label: '等待中' },
    { key: 'calling', label: '叫号中' },
    { key: 'missed', label: '已过号' },
    { key: 'served', label: '已服务' },
    { key: 'all', label: '全部' }
  ];

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.header}>
        <View className={styles.headerTitle}>🔔 前台叫号</View>
        <View className={styles.headerSubtitle}>多窗口并行叫号，智能负载均衡</View>
      </View>

      <View className={styles.overview}>
        <View className={styles.overviewCard}>
          <View className={styles.overviewCardValue}>{overview.waiting}</View>
          <View className={styles.overviewCardLabel}>等待中</View>
        </View>
        <View className={styles.overviewCard}>
          <View className={classnames(styles.overviewCardValue, styles.overviewValueCalling)}>
            {overview.calling}
          </View>
          <View className={styles.overviewCardLabel}>叫号中</View>
        </View>
        <View className={styles.overviewCard}>
          <View className={classnames(styles.overviewCardValue, styles.overviewValueServed)}>
            {overview.served}
          </View>
          <View className={styles.overviewCardLabel}>已服务</View>
        </View>
        <View className={styles.overviewCard}>
          <View className={classnames(styles.overviewCardValue, { [styles.overviewValueCalling]: overview.missed > 0 })} style={{ color: overview.missed > 0 ? '#FF9500' : undefined }}>
            {overview.missed}
          </View>
          <View className={styles.overviewCardLabel}>已过号</View>
        </View>
      </View>

      <View className={styles.sectionTitle}>
        <View className={styles.sectionHeader}>
          <Text>前台窗口</Text>
          <View className={styles.rebalanceBtn} onClick={handleRebalance}>
            一键均衡
          </View>
        </View>
      </View>

      <View className={styles.countersGrid}>
        {counters.map(counter => (
          <QueueCounter
            key={counter.id}
            counter={counter}
            loadPercent={getCounterLoadPercent(counter.id)}
            onCallNext={() => handleCallNext(counter.id)}
            onRebalance={handleRebalance}
          />
        ))}
      </View>

      <View className={styles.queueSection}>
        <View className={styles.sectionTitle} style={{ marginTop: 0 }}>
          <View>叫号队列</View>
        </View>

        <View className={styles.tabs}>
          {tabs.map(tab => (
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
        </View>

        <View className={styles.queueList}>
          {filteredQueue.length === 0 ? (
            <View style={{ textAlign: 'center', padding: '48rpx 0', color: '#6E6E91' }}>
              暂无数据
            </View>
          ) : (
            filteredQueue.map(item => (
              <View key={item.id} className={styles.queueItem}>
                <style>{QUEUE_UI_STYLES}</style>
                <View className={styles.queueInfo}>
                  <View className={classnames(styles.queueNo, getQueueNoClass(item.status))}>
                    {item.queueNo}
                    {item.isVip && <Text className="vip-tag">VIP</Text>}
                    {(item.priority || 0) > 100 && !item.isVip && <Text className="vip-tag">优</Text>}
                    {item.priorityReason && <Text className="reason-tag">{item.priorityReason}</Text>}
                    {(item.missedCount || 0) > 0 && <Text className="missed-count-tag">过号{item.missedCount}次</Text>}
                  </View>
                  <View className={styles.queueDetails}>
                    <View className={styles.queueDetailsName}>
                      {item.customerName} · {item.peopleCount}人
                    </View>
                    <View className={styles.queueDetailsMeta}>
                      {RoomLabels[item.roomType]} · {getCounterName(item.counterId)} · {formatDateTime(item.createdAt, 'HH:mm')}
                    </View>
                  </View>
                </View>

                <View className={styles.queueActions}>
                  <View className={classnames(styles.statusBadge, getStatusClass(item.status))}>
                    {QUEUE_STATUS_LABEL[item.status]}
                  </View>

                  {item.status === 'waiting' && (
                    <>
                      <GradientButton size="small" onClick={() => handleInsertFront(item.id)}>
                        插队
                      </GradientButton>
                      <GradientButton size="small" ghost onClick={() => setShowTransfer(item.id)}>
                        转窗口
                      </GradientButton>
                    </>
                  )}

                  {item.status === 'calling' && (
                    <>
                      <GradientButton size="small" onClick={() => handleServed(item.id)}>
                        完成
                      </GradientButton>
                      <GradientButton size="small" ghost onClick={() => handleMissed(item.id)}>
                        过号
                      </GradientButton>
                    </>
                  )}

                  {item.status === 'missed' && (
                    <>
                      <GradientButton size="small" onClick={() => handleRecallMissed(item.id)}>
                        重叫
                      </GradientButton>
                      <GradientButton size="small" ghost onClick={() => handleRequeueToTail(item.id)}>
                        放回队尾
                      </GradientButton>
                    </>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      <TransferModal />
      <PriorityModal />
    </ScrollView>
  );
};

export default QueuePage;
