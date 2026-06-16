export type PackageCategory = 'drink' | 'snack' | 'fruit' | 'combo' | 'beer' | 'wine';

export interface PackageItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface Package {
  id: string;
  name: string;
  category: PackageCategory;
  description: string;
  originalPrice: number;
  discountPrice: number;
  items: PackageItem[];
  tags: string[];
  hot: boolean;
  sort: number;
}

export interface SelectedPackage {
  packageId: string;
  quantity: number;
}

export const PACKAGE_CATEGORY_LABEL: Record<PackageCategory, string> = {
  drink: '饮料',
  snack: '小吃',
  fruit: '果盘',
  combo: '套餐',
  beer: '啤酒',
  wine: '洋酒'
};
