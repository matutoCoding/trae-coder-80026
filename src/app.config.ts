export default defineAppConfig({
  pages: [
    'pages/booking/index',
    'pages/schedule/index',
    'pages/queue/index',
    'pages/orders/index',
    'pages/packages/index',
    'pages/order-detail/index',
    'pages/room-detail/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#0F0F1A',
    navigationBarTitleText: 'KTV包厢预订',
    navigationBarTextStyle: 'white',
    backgroundColor: '#0F0F1A'
  },
  tabBar: {
    color: '#6E6E91',
    selectedColor: '#7B2FFD',
    backgroundColor: '#1A1A2E',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/booking/index',
        text: '预订'
      },
      {
        pagePath: 'pages/schedule/index',
        text: '排期'
      },
      {
        pagePath: 'pages/queue/index',
        text: '叫号'
      },
      {
        pagePath: 'pages/orders/index',
        text: '订单'
      }
    ]
  }
})
