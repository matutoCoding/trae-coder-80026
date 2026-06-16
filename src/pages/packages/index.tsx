import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import PackageCard from '../../components/PackageCard';
import GradientButton from '../../components/GradientButton';
import { usePackageStore } from '../../store/usePackageStore';
import { useBookingStore } from '../../store/useBookingStore';
import type { PackageCategory } from '../../types/package';
import { PACKAGE_CATEGORY_LABEL } from '../../types/package';
import styles from './index.module.scss';

const CATEGORIES: (PackageCategory | 'all')[] = ['all', 'combo', 'beer', 'wine', 'drink', 'snack', 'fruit'];

const PackagesPage: React.FC = () => {
  const { packages, selectedCategory, setSelectedCategory, getFilteredPackages } = usePackageStore();
  const { selectedPackages, addPackage, updatePackageQuantity, calculatePackageTotal } = useBookingStore();

  const filteredPackages = useMemo(() => {
    if (selectedCategory === 'all') return packages;
    return packages.filter(p => p.category === selectedCategory);
  }, [packages, selectedCategory]);

  const getPackageQuantity = (packageId: string): number => {
    const found = selectedPackages.find(p => p.packageId === packageId);
    return found?.quantity || 0;
  };

  const handleQuantityChange = (packageId: string, quantity: number) => {
    if (quantity === 0) {
      updatePackageQuantity(packageId, 0);
    } else {
      const current = getPackageQuantity(packageId);
      if (current === 0) {
        addPackage(packageId);
      }
      updatePackageQuantity(packageId, quantity);
    }
  };

  const totalCount = useMemo(() => {
    return selectedPackages.reduce((sum, p) => sum + p.quantity, 0);
  }, [selectedPackages]);

  const totalPrice = useMemo(() => calculatePackageTotal(), [calculatePackageTotal, selectedPackages]);

  const handleConfirm = () => {
    Taro.showToast({ title: '已添加到订单', icon: 'success' });
    setTimeout(() => Taro.navigateBack(), 1000);
  };

  return (
    <ScrollView className={styles.page} scrollY>
      <View className={styles.header}>
        <View className={styles.headerTitle}>🍾 酒水套餐</View>
        <View className={styles.headerSubtitle}>精选酒水小吃，为欢唱助兴</View>
      </View>

      <ScrollView className={styles.categoryBar} scrollX>
        {CATEGORIES.map(cat => (
          <View
            key={cat}
            className={classnames(styles.categoryItem, {
              [styles.categoryItemActive]: selectedCategory === cat
            })}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat === 'all' ? '全部' : PACKAGE_CATEGORY_LABEL[cat]}
          </View>
        ))}
      </ScrollView>

      {filteredPackages.map(pkg => (
        <PackageCard
          key={pkg.id}
          pkg={pkg}
          quantity={getPackageQuantity(pkg.id)}
          onQuantityChange={(q) => handleQuantityChange(pkg.id, q)}
        />
      ))}

      <View className={styles.bottomBar}>
        <View className={styles.summaryInfo}>
          <Text className={styles.summaryInfoCount}>
            已选 <Text className={styles.summaryInfoCountValue}>{totalCount}</Text> 份
          </Text>
          <Text className={styles.summaryInfoPrice}>¥{totalPrice}</Text>
        </View>
        <GradientButton
          size="large"
          onClick={handleConfirm}
          disabled={totalCount === 0}
        >
          确认选择
        </GradientButton>
      </View>
    </ScrollView>
  );
};

export default PackagesPage;
