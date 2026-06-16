import { create } from 'zustand';
import type { Package, PackageCategory } from '../types/package';
import { mockPackages } from '../data/packages';

interface PackageState {
  packages: Package[];
  selectedCategory: PackageCategory | 'all';
  setSelectedCategory: (category: PackageCategory | 'all') => void;
  getFilteredPackages: () => Package[];
  getPackageById: (id: string) => Package | undefined;
}

export const usePackageStore = create<PackageState>((set, get) => ({
  packages: mockPackages,
  selectedCategory: 'all',

  setSelectedCategory: (category) => set({ selectedCategory: category }),

  getFilteredPackages: () => {
    const { packages, selectedCategory } = get();
    if (selectedCategory === 'all') {
      return packages.sort((a, b) => a.sort - b.sort);
    }
    return packages
      .filter(p => p.category === selectedCategory)
      .sort((a, b) => a.sort - b.sort);
  },

  getPackageById: (id) => get().packages.find(p => p.id === id)
}));
