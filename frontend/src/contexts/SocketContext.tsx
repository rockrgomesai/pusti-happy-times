"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempted, setConnectionAttempted] = useState(false);

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    
    // Only attempt connection if backend URL is configured
    if (!socketUrl) {
      console.warn("⚠️ WebSocket: No backend URL configured, skipping connection");
      setConnectionAttempted(true);
      return;
    }

    const newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 3, // Reduced from 5 to fail faster
      timeout: 10000, // 10 second timeout
    });

    newSocket.on("connect", () => {
      console.log("✅ WebSocket connected:", newSocket.id);
      setIsConnected(true);
      setConnectionAttempted(true);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("ℹ️ WebSocket disconnected:", reason);
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      // Only log on first attempt to avoid console spam
      if (!connectionAttempted) {
        console.warn("⚠️ WebSocket connection unavailable. Real-time features disabled.");
        console.debug("WebSocket error details:", error.message);
      }
      setIsConnected(false);
      setConnectionAttempted(true);
    });

    newSocket.on("error", (error) => {
      console.debug("WebSocket error:", error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.removeAllListeners();
      newSocket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
