import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Manager } from 'socket.io-client';

// Create a socket manager instance
const manager = new Manager('http://localhost:3020', {
  autoConnect: false
});

// Create a socket instance
const socket = manager.socket('/');

// Create context with proper typing
type SocketContextType = {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
};

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Provider component
type SocketProviderProps = {
  children: ReactNode;
};

export function SocketProvider({ children }: SocketProviderProps) {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      (socket as any).auth = { token };
    } else {
      (socket as any).auth = {};
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const connect = () => {
    socket.connect();
  };

  const disconnect = () => {
    socket.disconnect();
  };

  const value = {
    isConnected,
    connect,
    disconnect
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

// Custom hook for using socket
export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return {
    socket,
    ...context
  };
} 