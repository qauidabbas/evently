import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const useSocket = (eventId) => {
  const [socket, setSocket] = useState(null);
  const [liveSeatCount, setLiveSeatCount] = useState(null);

  useEffect(() => {
    if (!eventId) return;

    const socketInstance = io(SOCKET_URL);

    socketInstance.on('connect', () => {
      console.log('Connected to socket server');
      socketInstance.emit('join-event', eventId);
    });

    socketInstance.on('seat-update', (data) => {
      if (data.eventId === eventId) {
        // Calculate remaining capacity
        const remaining = data.capacity - data.registrationCount;
        setLiveSeatCount(remaining >= 0 ? remaining : 0);
      }
    });

    setSocket(socketInstance);

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [eventId]);

  return { socket, liveSeatCount, setLiveSeatCount };
};
