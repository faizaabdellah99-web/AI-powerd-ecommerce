import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: false, transports: ['websocket', 'polling'] });
  }
  return socket;
}

// ── useSocket hook ────────────────────────────────────────────────────────────
export function useSocket(events = {}) {
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    const s = getSocket();
    if (!s.connected) s.connect();

    // Register listeners
    const handlers = {};
    Object.entries(eventsRef.current).forEach(([event, handler]) => {
      handlers[event] = handler;
      s.on(event, handler);
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        s.off(event, handler);
      });
    };
  }, []);
}

// ── useOrderSocket hook for admin/vendor dashboard ────────────────────────────
export function useOrderSocket({ onNewOrder, onOrderPaid, onStatusUpdate } = {}) {
  useSocket({
    'new-order': (data) => {
      // Show notification
      toast.success(
        `🛒 New order ${data.orderId} — $${data.total?.toFixed(2)} by ${data.customerName}`,
        { duration: 5000 }
      );
      onNewOrder?.(data);
    },
    'order-paid': (data) => {
      toast.success(
        `💰 Payment received: ${data.orderId} — $${data.total?.toFixed(2)}`,
        { duration: 5000, icon: '💰' }
      );
      onOrderPaid?.(data);
    },
    'order-status-updated': (data) => {
      onStatusUpdate?.(data);
    },
  });
}
