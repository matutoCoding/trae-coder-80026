import type { Room, RoomBookingSlot } from '../types/room';

export const mockRooms: Room[] = [
  {
    id: 'room-001',
    name: '星空小包',
    roomNo: 'A101',
    type: 'small',
    capacity: 4,
    floor: 1,
    hourlyRate: 88,
    status: 'available',
    facilities: ['无线麦克风', '智能灯光', '点歌系统', '沙发'],
    description: '温馨舒适的小包厢，适合朋友小聚'
  },
  {
    id: 'room-002',
    name: '星辰小包',
    roomNo: 'A102',
    type: 'small',
    capacity: 4,
    floor: 1,
    hourlyRate: 88,
    status: 'occupied',
    facilities: ['无线麦克风', '智能灯光', '点歌系统', '沙发'],
    description: '温馨舒适的小包厢，适合朋友小聚'
  },
  {
    id: 'room-003',
    name: '霓虹中包',
    roomNo: 'B201',
    type: 'medium',
    capacity: 8,
    floor: 2,
    hourlyRate: 158,
    status: 'available',
    facilities: ['无线麦克风x2', '智能灯光', '点歌系统', 'L型沙发', '茶几'],
    description: '宽敞明亮的中包厢，适合小型派对'
  },
  {
    id: 'room-004',
    name: '霓虹中包',
    roomNo: 'B202',
    type: 'medium',
    capacity: 8,
    floor: 2,
    hourlyRate: 158,
    status: 'reserved',
    facilities: ['无线麦克风x2', '智能灯光', '点歌系统', 'L型沙发', '茶几'],
    description: '宽敞明亮的中包厢，适合小型派对'
  },
  {
    id: 'room-005',
    name: '极光大包',
    roomNo: 'C301',
    type: 'large',
    capacity: 15,
    floor: 3,
    hourlyRate: 268,
    status: 'available',
    facilities: ['无线麦克风x4', '舞台灯光', '点歌系统', 'U型沙发', '茶几x2', '独立卫生间'],
    description: '豪华大包厢，适合生日派对和公司聚会'
  },
  {
    id: 'room-006',
    name: '极光大包',
    roomNo: 'C302',
    type: 'large',
    capacity: 15,
    floor: 3,
    hourlyRate: 268,
    status: 'available',
    facilities: ['无线麦克风x4', '舞台灯光', '点歌系统', 'U型沙发', '茶几x2', '独立卫生间'],
    description: '豪华大包厢，适合生日派对和公司聚会'
  },
  {
    id: 'room-007',
    name: '皇家VIP',
    roomNo: 'D401',
    type: 'vip',
    capacity: 25,
    floor: 4,
    hourlyRate: 588,
    status: 'available',
    facilities: ['无线麦克风x6', '专业舞台灯光', '点歌系统', '豪华沙发', '吧台', '独立卫生间', 'DJ台'],
    description: '至尊VIP包厢，配备专业设备，适合高端商务宴请'
  },
  {
    id: 'room-008',
    name: '总统豪华',
    roomNo: 'E501',
    type: 'luxury',
    capacity: 40,
    floor: 5,
    hourlyRate: 1288,
    status: 'maintenance',
    facilities: ['无线麦克风x8', '专业舞台', '灯光秀', '点歌系统', '豪华沙发', '独立吧台', '独立卫生间x2', 'DJ台', '舞池'],
    description: '顶级豪华包厢，配备专业舞台和舞池，是举办大型派对的理想选择'
  }
];

export const mockRoomSchedules: Record<string, RoomBookingSlot[]> = {
  'room-001': [
    { bookingId: 'bk-001', startTime: '18:00', endTime: '20:00', status: 'reserved' }
  ],
  'room-002': [
    { bookingId: 'bk-002', startTime: '14:00', endTime: '22:00', status: 'occupied' }
  ],
  'room-003': [
    { bookingId: 'bk-003', startTime: '20:00', endTime: '23:00', status: 'reserved' }
  ],
  'room-004': [
    { bookingId: 'bk-004', startTime: '19:00', endTime: '22:00', status: 'reserved' }
  ],
  'room-005': [],
  'room-006': [
    { bookingId: 'bk-005', startTime: '15:00', endTime: '18:00', status: 'reserved' },
    { bookingId: 'bk-006', startTime: '21:00', endTime: '24:00', status: 'reserved' }
  ],
  'room-007': [],
  'room-008': []
};
