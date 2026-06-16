import type { Package } from '../types/package';

export const mockPackages: Package[] = [
  {
    id: 'pkg-001',
    name: '欢唱啤酒套餐',
    category: 'combo',
    description: '青岛啤酒12瓶 + 精美果盘1份 + 小吃3份',
    originalPrice: 588,
    discountPrice: 398,
    items: [
      { id: 'i-1', name: '青岛啤酒', quantity: 12, unit: '瓶' },
      { id: 'i-2', name: '精美果盘', quantity: 1, unit: '份' },
      { id: 'i-3', name: '花生', quantity: 1, unit: '份' },
      { id: 'i-4', name: '瓜子', quantity: 1, unit: '份' },
      { id: 'i-5', name: '薯片', quantity: 1, unit: '份' }
    ],
    tags: ['热销', '超值'],
    hot: true,
    sort: 1
  },
  {
    id: 'pkg-002',
    name: '豪华洋酒套餐',
    category: 'combo',
    description: '轩尼诗VSOP 1瓶 + 软饮4瓶 + 豪华果盘 + 小吃4份',
    originalPrice: 1688,
    discountPrice: 1288,
    items: [
      { id: 'i-6', name: '轩尼诗VSOP', quantity: 1, unit: '瓶' },
      { id: 'i-7', name: '红茶', quantity: 2, unit: '瓶' },
      { id: 'i-8', name: '绿茶', quantity: 2, unit: '瓶' },
      { id: 'i-9', name: '豪华果盘', quantity: 1, unit: '份' },
      { id: 'i-10', name: '鸡翅', quantity: 1, unit: '份' },
      { id: 'i-11', name: '薯条', quantity: 1, unit: '份' },
      { id: 'i-12', name: '爆米花', quantity: 1, unit: '份' },
      { id: 'i-13', name: '开心果', quantity: 1, unit: '份' }
    ],
    tags: ['高端', '推荐'],
    hot: true,
    sort: 2
  },
  {
    id: 'pkg-003',
    name: '青岛啤酒一打',
    category: 'beer',
    description: '青岛啤酒12瓶',
    originalPrice: 360,
    discountPrice: 288,
    items: [
      { id: 'i-14', name: '青岛啤酒', quantity: 12, unit: '瓶' }
    ],
    tags: ['啤酒'],
    hot: true,
    sort: 3
  },
  {
    id: 'pkg-004',
    name: '百威啤酒一打',
    category: 'beer',
    description: '百威啤酒12瓶',
    originalPrice: 420,
    discountPrice: 338,
    items: [
      { id: 'i-15', name: '百威啤酒', quantity: 12, unit: '瓶' }
    ],
    tags: ['啤酒', '进口'],
    hot: false,
    sort: 4
  },
  {
    id: 'pkg-005',
    name: '芝华士12年',
    category: 'wine',
    description: '芝华士12年 1瓶 + 软饮4瓶',
    originalPrice: 988,
    discountPrice: 788,
    items: [
      { id: 'i-16', name: '芝华士12年', quantity: 1, unit: '瓶' },
      { id: 'i-17', name: '红茶', quantity: 4, unit: '瓶' }
    ],
    tags: ['洋酒', '经典'],
    hot: false,
    sort: 5
  },
  {
    id: 'pkg-006',
    name: '豪华果盘',
    category: 'fruit',
    description: '当季新鲜水果拼盘',
    originalPrice: 128,
    discountPrice: 98,
    items: [
      { id: 'i-18', name: '西瓜', quantity: 1, unit: '份' },
      { id: 'i-19', name: '哈密瓜', quantity: 1, unit: '份' },
      { id: 'i-20', name: '葡萄', quantity: 1, unit: '份' },
      { id: 'i-21', name: '橙子', quantity: 1, unit: '份' },
      { id: 'i-22', name: '圣女果', quantity: 1, unit: '份' }
    ],
    tags: ['水果', '新鲜'],
    hot: false,
    sort: 6
  },
  {
    id: 'pkg-007',
    name: '小吃拼盘',
    category: 'snack',
    description: '鸡翅+薯条+鸡米花+洋葱圈',
    originalPrice: 168,
    discountPrice: 128,
    items: [
      { id: 'i-23', name: '香辣鸡翅', quantity: 6, unit: '只' },
      { id: 'i-24', name: '薯条', quantity: 1, unit: '份' },
      { id: 'i-25', name: '鸡米花', quantity: 1, unit: '份' },
      { id: 'i-26', name: '洋葱圈', quantity: 1, unit: '份' }
    ],
    tags: ['小吃', '推荐'],
    hot: true,
    sort: 7
  },
  {
    id: 'pkg-008',
    name: '饮料畅饮',
    category: 'drink',
    description: '可乐、雪碧、橙汁、柠檬汁无限畅饮（限4小时）',
    originalPrice: 168,
    discountPrice: 128,
    items: [
      { id: 'i-27', name: '可乐', quantity: 1, unit: '畅饮' },
      { id: 'i-28', name: '雪碧', quantity: 1, unit: '畅饮' },
      { id: 'i-29', name: '橙汁', quantity: 1, unit: '畅饮' },
      { id: 'i-30', name: '柠檬汁', quantity: 1, unit: '畅饮' }
    ],
    tags: ['饮料', '畅饮'],
    hot: false,
    sort: 8
  },
  {
    id: 'pkg-009',
    name: '生日派对套餐',
    category: 'combo',
    description: '香槟1瓶 + 啤酒24瓶 + 豪华果盘 + 蛋糕 + 生日布置',
    originalPrice: 1888,
    discountPrice: 1588,
    items: [
      { id: 'i-31', name: '香槟', quantity: 1, unit: '瓶' },
      { id: 'i-32', name: '青岛啤酒', quantity: 24, unit: '瓶' },
      { id: 'i-33', name: '豪华果盘', quantity: 1, unit: '份' },
      { id: 'i-34', name: '生日蛋糕', quantity: 1, unit: '个' },
      { id: 'i-35', name: '生日布置', quantity: 1, unit: '套' }
    ],
    tags: ['生日', '派对', '定制'],
    hot: true,
    sort: 9
  },
  {
    id: 'pkg-010',
    name: '商务宴请套餐',
    category: 'combo',
    description: '人头马XO 1瓶 + 软饮6瓶 + 豪华果盘x2 + 精致小吃x6',
    originalPrice: 3688,
    discountPrice: 2988,
    items: [
      { id: 'i-36', name: '人头马XO', quantity: 1, unit: '瓶' },
      { id: 'i-37', name: '软饮', quantity: 6, unit: '瓶' },
      { id: 'i-38', name: '豪华果盘', quantity: 2, unit: '份' },
      { id: 'i-39', name: '精致小吃', quantity: 6, unit: '份' }
    ],
    tags: ['商务', '高端'],
    hot: false,
    sort: 10
  }
];
