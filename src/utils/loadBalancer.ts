import type { Counter, QueueItem } from '../types/queue';

export interface BalancedAssignment {
  counterId: string;
  counterName: string;
  loadScore: number;
}

export interface CounterLoad {
  counterId: string;
  waitingCount: number;
  servingCount: number;
  avgWaitTime: number;
  lastActivityTime: string;
  loadScore: number;
}

const calculateCounterLoad = (
  counter: Counter,
  assignedItems: QueueItem[]
): CounterLoad => {
  const waitingItems = assignedItems.filter(
    item => item.status === 'waiting' && item.counterId === counter.id
  );
  const callingItems = assignedItems.filter(
    item => item.status === 'calling' && item.counterId === counter.id
  );

  const loadScore =
    waitingItems.length * 3 +
    callingItems.length * 2 +
    counter.currentServingCount * 1.5 +
    counter.avgWaitTime / 60;

  return {
    counterId: counter.id,
    waitingCount: waitingItems.length,
    servingCount: callingItems.length,
    avgWaitTime: counter.avgWaitTime,
    lastActivityTime: counter.lastActivityTime,
    loadScore
  };
};

export const findLeastLoadedCounter = (
  counters: Counter[],
  queueItems: QueueItem[]
): BalancedAssignment | null => {
  console.log('[LoadBalancer] 开始负载均衡分配');

  const onlineCounters = counters.filter(c => c.status === 'online');

  if (onlineCounters.length === 0) {
    console.log('[LoadBalancer] 无可用前台窗口');
    return null;
  }

  const loads: CounterLoad[] = onlineCounters.map(counter =>
    calculateCounterLoad(counter, queueItems)
  );

  loads.sort((a, b) => a.loadScore - b.loadScore);

  const selected = loads[0];
  const selectedCounter = counters.find(c => c.id === selected.counterId);

  console.log('[LoadBalancer] 分配结果', {
    counterName: selectedCounter?.name,
    loadScore: selected.loadScore,
    allLoads: loads.map(l => ({
      counter: counters.find(c => c.id === l.counterId)?.name,
      score: l.loadScore
    }))
  });

  return {
    counterId: selected.counterId,
    counterName: selectedCounter?.name || '',
    loadScore: selected.loadScore
  };
};

export const getAllCountersLoad = (
  counters: Counter[],
  queueItems: QueueItem[]
): CounterLoad[] => {
  return counters
    .filter(c => c.status !== 'offline')
    .map(counter => calculateCounterLoad(counter, queueItems))
    .sort((a, b) => a.loadScore - b.loadScore);
};

export const rebalanceQueues = (
  counters: Counter[],
  queueItems: QueueItem[]
): Map<string, string> => {
  const reassignment = new Map<string, string>();
  const loads = getAllCountersLoad(counters, queueItems);

  if (loads.length < 2) return reassignment;

  const avgLoad = loads.reduce((sum, l) => sum + l.loadScore, 0) / loads.length;
  const overloaded = loads.filter(l => l.loadScore > avgLoad * 1.3);
  const underloaded = loads.filter(l => l.loadScore < avgLoad * 0.7);

  for (const over of overloaded) {
    if (underloaded.length === 0) break;

    const waitingItems = queueItems.filter(
      item => item.status === 'waiting' && item.counterId === over.counterId
    );

    for (const item of waitingItems) {
      if (underloaded.length === 0) break;

      const target = underloaded.reduce((min, curr) =>
        curr.loadScore < min.loadScore ? curr : min
      );

      reassignment.set(item.id, target.counterId);
      target.loadScore += 3;

      if (target.loadScore >= avgLoad * 0.9) {
        const idx = underloaded.findIndex(u => u.counterId === target.counterId);
        underloaded.splice(idx, 1);
      }
    }
  }

  console.log('[LoadBalancer] 负载均衡重排', {
    reassignedCount: reassignment.size,
    avgLoad
  });

  return reassignment;
};
