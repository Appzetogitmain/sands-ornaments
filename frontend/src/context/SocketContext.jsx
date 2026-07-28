/**
 * SocketContext.jsx
 * 
 * Manages the Socket.IO client connection lifecycle.
 * - Connects when the user is authenticated (token available).
 * - Joins the correct server-side room automatically (handled by socketAuth middleware).
 * - Disconnects cleanly on logout.
 * - Prevents duplicate connections via a singleton ref.
 * - Exposes `socket` instance and `isConnected` boolean to consumers.
 */
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

// Derive socket server URL from the API URL (strip /api suffix)
const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
  .replace(/\/api\/?$/, '');

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    // Retrieve token at connection time
    let tokenKey = 'sands_token';
    if (user?.role === 'admin') {
      tokenKey = 'sands_admin_token';
    } else if (user?.role === 'seller') {
      tokenKey = 'sands_seller_token';
    }

    const token = localStorage.getItem(tokenKey);
    if (!token || !user) return;

    // Avoid duplicate connections
    if (socketRef.current?.connected) return;

    // Clean up any stale socket before creating a new one
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      // Reconnection settings — retries up to 5 times with exponential backoff
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      // Use websocket first, fall back to polling
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      // Auth errors should NOT trigger infinite reconnects
      if (err.message?.includes('Authentication error')) {
        console.warn('[Socket] Auth error — stopping reconnect.');
        socket.disconnect();
      } else {
        console.warn('[Socket] Connection error:', err.message);
      }
    });

    socketRef.current = socket;
  }, [user]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Connect on login, disconnect on logout
  useEffect(() => {
    if (user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);

  const value = {
    socket: socketRef.current,
    isConnected,
    // Expose a stable getter so listeners always get the current socket ref
    getSocket: () => socketRef.current,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
};

export default SocketContext;
