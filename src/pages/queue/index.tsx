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
import { formatDateTime } from '../../utils/timeUtils';
import styles from './index.module.scss';

type TabType = 'all' | 'waiting' | 'calling' | 'served';

const QueuePage: React.FC = () => {
  const { counters, queueItems, callNext, markServed, markMissed, triggerRebalance, getCountersLoad } = useQueueStore();
  const { checkInBooking } = useBookingStore();
  const [activeTab, setActiveTab] = useState<TabType>('waiting');

  const overview = useMemo(() => {
    return {
      waiting: queueItems.filter(q => q.status === 'waiting').length,
      calling: queueItems.filter(q => q.status === 'calling').length,
      served: queueItems.filter(q => q.status === 'served').length
    };
  }, [queueItems]);

  const counterLoads = useMemo(() => getCountersLoad(), [getCountersLoad, counters, queueItems]);

  const filteredQueue = useMemo(() => {
    let items = queueItems;
    if (activeTab !== 'all') {
      items = queueItems.filter(q => q.status === activeTab);
    }
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

  const handleRebalance = () => {
    triggerRebalance();
    Taro.showToast({ title: '负载均衡已执行', icon: 'success' });
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
                <View className={styles.queueInfo}>
                  <View className={classnames(styles.queueNo, getQueueNoClass(item.status))}>
                    {item.queueNo}
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
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default QueuePage;
