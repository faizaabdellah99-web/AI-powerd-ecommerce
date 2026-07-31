import { create } from 'zustand';
import { io } from 'socket.io-client';

export const useOrderStore = create((set) => ({
  newOrderCount: 0,
  orderUpdateCount: 0,
  topCustomers: [],
  recentOrders: [],
  incrementNewOrders: () => set((state) => ({ newOrderCount: state.newOrderCount + 1 })),
  incrementOrderUpdates: () => set((state) => ({ orderUpdateCount: state.orderUpdateCount + 1 })),
  resetNewOrders: () => set({ newOrderCount: 0 }),
  resetOrderUpdates: () => set({ orderUpdateCount: 0 }),
  setTopCustomers: (customers) => set({ topCustomers: customers }),
  addRecentOrder: (order) => set((state) => ({
    recentOrders: [order, ...state.recentOrders].slice(0, 5)
  })),
}));

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
const s = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
s.on('new-order', (data) => {
  useOrderStore.getState().incrementNewOrders();
  if (data) useOrderStore.getState().addRecentOrder(data);
});
s.on('order-status-updated', () => {
  useOrderStore.getState().incrementOrderUpdates();
});