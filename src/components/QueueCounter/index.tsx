import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import type { Counter } from '../../types/queue';
import GradientButton from '../GradientButton';
import styles from './index.module.scss';

interface QueueCounterProps {
  counter: Counter;
  loadPercent?: number;
  onCallNext?: () => void;
  onRebalance?: () => void;
}

const QueueCounter: React.FC<QueueCounterProps> = ({
  counter,
  loadPercent = 0,
  onCallNext,
  onRebalance
}) => {
  const cardClass = classnames(styles.card, {
    [styles.cardOnline]: counter.status === 'online',
    [styles.cardBusy]: counter.status === 'busy',
    [styles.cardOffline]: counter.status === 'offline'
  });

  const statusClass = {
    online: styles.statusOnline,
    busy: styles.statusBusy,
    offline: styles.statusOffline
  }[counter.status];

  const statusLabel = {
    online: '在线',
    busy: '忙碌',
    offline: '离线'
  }[counter.status];

  return (
    <View className={cardClass}>
      <View className={styles.header}>
        <View className={styles.name}>{counter.name}</View>
        <View className={classnames(styles.statusBadge, statusClass)}>
          {statusLabel}
        </View>
      </View>

      <View className={styles.stats}>
        <View className={styles.statItem}>
          <View className={styles.statItemValue}>{counter.waitingQueueCount}</View>
          <View className={styles.statItemLabel}>等待中</View>
        </View>
        <View className={styles.statItem}>
          <View className={styles.statItemValue}>{counter.currentServingCount}</View>
          <View className={styles.statItemLabel}>服务中</View>
        </View>
        <View className={styles.statItem}>
          <View className={styles.statItemValue}>{counter.totalServedCount}</View>
          <View className={styles.statItemLabel}>已服务</View>
        </View>
      </View>

      <View className={styles.loadBar}>
        <View className={styles.loadBarLabel}>
          <Text>负载率</Text>
          <Text>{loadPercent.toFixed(0)}%</Text>
        </View>
        <View className={styles.loadBarTrack}>
          <View
            className={styles.loadBarFill}
            style={{ width: `${Math.min(loadPercent, 100)}%` }}
          />
        </View>
      </View>

      {counter.status !== 'offline' && (
        <View className={styles.actions}>
          <GradientButton
            size="small"
            block
            onClick={onCallNext}
            disabled={counter.waitingQueueCount === 0}
          >
            叫下一位
          </GradientButton>
          <GradientButton
            size="small"
            block
            ghost
            onClick={onRebalance}
          >
            负载均衡
          </GradientButton>
        </View>
      )}
    </View>
  );
};

export default QueueCounter;
