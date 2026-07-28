import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import toast from 'react-hot-toast';

const SupportContext = createContext(null);

export const SupportProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [tickets, setTickets] = useState([]);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // Widget open/close state

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await api.get('user/support');
      if (res.data.success) {
        setTickets(res.data.data?.tickets || res.data.tickets || []);
      }
    } catch (err) {
      console.error('Failed to fetch support tickets:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createNewTicket = async (subject, category, message, orderId = '', attachments = []) => {
    try {
      const res = await api.post('user/support', {
        subject,
        category,
        message,
        orderId,
        userName: user?.name,
        userEmail: user?.email,
        attachments
      });
      if (res.data.success) {
        const newTicket = res.data.data?.ticket || res.data.ticket;
        setTickets(prev => [newTicket, ...prev]);
        setActiveTicketId(newTicket._id);
        toast.success('Support ticket created successfully!');
        return newTicket;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create support ticket');
    }
    return null;
  };

  const sendReply = async (ticketId, text, attachments = []) => {
    try {
      const res = await api.post(`user/support/${ticketId}/reply`, { message: text, attachments });
      if (res.data.success) {
        const updatedTicket = res.data.data?.ticket || res.data.ticket;
        setTickets(prev => prev.map(t => t._id === ticketId ? updatedTicket : t));
        return true;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    }
    return false;
  };

  // Fetch tickets on login
  useEffect(() => {
    if (user && user.role === 'user') {
      fetchTickets();
    } else {
      setTickets([]);
      setActiveTicketId(null);
    }
  }, [user, fetchTickets]);

  // Socket listener for support replies
  useEffect(() => {
    if (!socket || !user) return;

    const handleSupportMessage = (data) => {
      // data contains: { ticketId, _id, userId, reply: { from, text, date }, status }
      const { _id, reply } = data;
      
      setTickets(prev => prev.map(t => {
        if (t._id === _id) {
          // Check if reply already exists to avoid duplicates
          const exists = t.replies.some(r => r.text === reply.text && r.from === reply.from && Math.abs(new Date(r.date) - new Date(reply.date)) < 2000);
          if (exists) return t;
          
          return {
            ...t,
            status: data.status,
            replies: [...t.replies, reply],
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      }));

      // Show toast if message is from admin and widget is not active on this ticket
      if (reply.from === 'admin') {
        if (!isOpen || activeTicketId !== _id) {
          toast.success(`Support: "${reply.text.substring(0, 30)}${reply.text.length > 30 ? '...' : ''}"`, {
            icon: '💬',
            duration: 5000,
            onClick: () => {
              setIsOpen(true);
              setActiveTicketId(_id);
            }
          });
        }
      }
    };

    socket.on('support_message', handleSupportMessage);

    return () => {
      socket.off('support_message', handleSupportMessage);
    };
  }, [socket, user, isOpen, activeTicketId]);

  const activeTicket = tickets.find(t => t._id === activeTicketId) || null;

  return (
    <SupportContext.Provider value={{
      tickets,
      activeTicket,
      activeTicketId,
      setActiveTicketId,
      isLoading,
      isOpen,
      setIsOpen,
      fetchTickets,
      createNewTicket,
      sendReply
    }}>
      {children}
    </SupportContext.Provider>
  );
};

export const useSupport = () => {
  const ctx = useContext(SupportContext);
  if (!ctx) throw new Error('useSupport must be used inside SupportProvider');
  return ctx;
};
