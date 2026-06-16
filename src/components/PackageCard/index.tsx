import React from 'react';
import { View, Text } from '@tarojs/components';
import type { Package } from '../../types/package';
import styles from './index.module.scss';

interface PackageCardProps {
  pkg: Package;
  quantity?: number;
  onQuantityChange?: (quantity: number) => void;
  onClick?: () => void;
}

const PackageCard: React.FC<PackageCardProps> = ({
  pkg,
  quantity = 0,
  onQuantityChange,
  onClick
}) => {
  return (
    <View className={styles.card} onClick={onClick}>
      <View className={styles.header}>
        <View className={styles.title}>{pkg.name}</View>
        {pkg.hot && <View className={styles.hotBadge}>热销</View>}
      </View>

      <View className={styles.description}>{pkg.description}</View>

      <View className={styles.tags}>
        {pkg.tags.map((tag, index) => (
          <View key={index} className={styles.tag}>
            {tag}
          </View>
        ))}
      </View>

      <View className={styles.items}>
        {pkg.items.slice(0, 4).map((item, index) => (
          <View key={index} className={styles.item}>
            {item.name} x{item.quantity}
          </View>
        ))}
      </View>

      <View className={styles.footer}>
        <View className={styles.price}>
          <Text className={styles.currentPrice}>¥{pkg.discountPrice}</Text>
          <Text className={styles.originalPrice}>¥{pkg.originalPrice}</Text>
        </View>

        {onQuantityChange && (
          <View className={styles.quantityControl} onClick={(e) => e.stopPropagation()}>
            <View
              className={styles.quantityBtn}
              onClick={() => onQuantityChange(Math.max(0, quantity - 1))}
            >
              -
            </View>
            <Text className={styles.quantityValue}>{quantity}</Text>
            <View
              className={styles.quantityBtn}
              onClick={() => onQuantityChange(quantity + 1)}
            >
              +
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

export default PackageCard;
