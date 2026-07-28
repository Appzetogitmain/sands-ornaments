import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Phone,
  Mail,
  Clock,
  HelpCircle,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Percent,
  Wallet,
  Key,
  MessageSquare,
  Plus,
  Send,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useResetScroll } from "../../../hooks/useResetScroll";
import api from "../../../services/api";
import { useSocket } from "../../../context/SocketContext";
import toast from "react-hot-toast";

const SellerSupport = () => {
  useResetScroll();
  const navigate = useNavigate();
  const { socket } = useSocket();

  // Tickets state
  const [tickets, setTickets] = useState([]);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  


  // New ticket state
  const [newTicket, setNewTicket] = useState({
    subject: "",
    category: "General Inquiry",
    message: ""
  });

  const chatEndRef = useRef(null);

  // Fetch my support tickets
  const fetchMyTickets = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("seller/support");
      if (res.data.success) {
        setTickets(res.data.data?.tickets || res.data.tickets || []);
      }
    } catch (err) {
      console.error("Failed to load seller tickets:", err);
      toast.error("Failed to load support tickets");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTickets();
  }, []);

  // Scroll to bottom of chat when active ticket or replies change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeTicketId, tickets]);

  // Socket listener for real-time seller support updates
  useEffect(() => {
    if (!socket) return;

    const handleSellerSupportMessage = (data) => {
      const { _id, reply, status } = data;
      setTickets(prev => prev.map(t => {
        if (t._id === _id) {
          const exists = t.replies.some(r => r.text === reply.text && r.from === reply.from && Math.abs(new Date(r.date) - new Date(reply.date)) < 2000);
          if (exists) return t;

          return {
            ...t,
            status,
            replies: [...t.replies, reply],
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      }));

      if (reply.from === "admin") {
        toast.success(`Admin: "${reply.text.substring(0, 30)}..."`, {
          icon: "💬"
        });
      }
    };

    socket.on("seller_support_message", handleSellerSupportMessage);

    return () => {
      socket.off("seller_support_message", handleSellerSupportMessage);
    };
  }, [socket]);

  // Submit new support ticket
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicket.subject.trim() || !newTicket.message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const res = await api.post("seller/support", newTicket);
      if (res.data.success) {
        const ticket = res.data.data?.ticket || res.data.ticket;
        setTickets(prev => [ticket, ...prev]);
        setActiveTicketId(ticket._id);
        setIsCreateOpen(false);
        setNewTicket({ subject: "", category: "General Inquiry", message: "" });
        toast.success("Support ticket created!");
      }
    } catch (err) {
      console.error("Failed to create support ticket:", err);
      toast.error(err.response?.data?.message || "Failed to submit ticket");
    }
  };

  // Submit reply message
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicketId) return;

    try {
      const res = await api.post(`seller/support/${activeTicketId}/reply`, { message: replyText });
      if (res.data.success) {
        const updated = res.data.data?.ticket || res.data.ticket;
        setTickets(prev => prev.map(t => t._id === activeTicketId ? updated : t));
        setReplyText("");
      }
    } catch (err) {
      console.error("Failed to reply:", err);
      toast.error("Failed to send message");
    }
  };

  const activeTicket = tickets.find(t => t._id === activeTicketId) || null;



  return (
    <div className="min-h-screen bg-[#FDF5F6] text-gray-900 font-sans pb-16 selection:bg-[#3E2723] selection:text-white">
      {/* Header Navigation */}
      <div className="container mx-auto px-6 py-6 flex items-center justify-between border-b border-[#3E2723]/5">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#3E2723]/60 hover:text-[#3E2723] transition-all group font-bold uppercase tracking-widest text-[10px]"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>
        <span className="text-xs font-black uppercase tracking-[0.2em] text-[#3E2723]">
          Sands Jewels
        </span>
      </div>

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center px-6 pt-12 pb-8 relative overflow-hidden">
        <span className="text-[#3E2723]/60 text-[10px] md:text-xs font-bold uppercase tracking-[0.25em] mb-3 block">
          Seller gateway
        </span>
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-display font-black text-black mb-4 uppercase tracking-tight leading-tight">
          Merchant Support Desk
        </h1>
        <p className="text-gray-500 font-serif text-sm md:text-base max-w-xl mx-auto leading-relaxed">
          Need direct support or have questions? Use our real-time ticketing console below to raise queries with the administration team.
        </p>
      </div>

      {/* Live Ticket Desk Section */}
      <div className="max-w-6xl mx-auto px-6 mb-16">
        <div className="bg-white rounded-[2rem] border border-[#3E2723]/5 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[550px]">
          
          {/* Left Column: Ticket List */}
          <div className={`md:col-span-4 border-r border-gray-100 flex flex-col h-full bg-gray-50/50 ${activeTicketId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white w-full">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#3E2723]" />
                Support Tickets
              </h3>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="w-8 h-8 rounded-lg bg-[#3E2723] hover:bg-[#3E2723]/90 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                title="New Ticket"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[480px] p-3 space-y-2">
              {isLoading && tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mb-2" />
                  <span className="text-xs font-semibold">Loading tickets...</span>
                </div>
              ) : tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-center p-6">
                  <AlertCircle className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-xs font-bold text-gray-800">No Tickets Yet</p>
                  <p className="text-[10px] text-gray-400 max-w-[180px] mt-1">Raise a new query to start chatting with support.</p>
                </div>
              ) : (
                tickets.map(ticket => (
                  <button
                    key={ticket._id}
                    onClick={() => setActiveTicketId(ticket._id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      activeTicketId === ticket._id
                        ? "bg-white border-[#3E2723]/25 shadow-md scale-[1.01]"
                        : "bg-white/50 border-gray-100 hover:border-gray-200 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[9px] font-bold text-gray-400 font-mono">#{ticket.ticketId}</span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                        ticket.status === "Open" ? "bg-red-50 text-red-700" :
                        ticket.status === "In Progress" ? "bg-amber-50 text-amber-700" :
                        "bg-green-50 text-green-700"
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-gray-900 truncate mb-1">{ticket.subject}</h4>
                    <div className="flex items-center justify-between gap-1 text-[10px] text-gray-500">
                      <span className="font-semibold text-[#3E2723]/70">{ticket.category}</span>
                      <span>{new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Chat Console */}
          <div className={`md:col-span-8 flex flex-col h-full min-h-[480px] ${!activeTicketId ? 'hidden md:flex' : 'flex'}`}>
            {activeTicket ? (
              <div className="flex flex-col h-full flex-1">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 bg-white flex items-center justify-between">
                  <div className="flex items-center">
                    <button
                      onClick={() => setActiveTicketId(null)}
                      className="md:hidden mr-3 p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                      title="Back to Tickets"
                    >
                      <ArrowLeft className="w-5 h-5 text-[#3E2723]" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-bold text-gray-900">{activeTicket.subject}</h3>
                        <span className="text-[10px] font-bold text-gray-400 font-mono">#{activeTicket.ticketId}</span>
                      </div>
                      <p className="text-[10px] font-semibold text-gray-500">{activeTicket.category}</p>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                    activeTicket.status === "Open" ? "bg-red-50 text-red-700 border border-red-100" :
                    activeTicket.status === "In Progress" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                    "bg-green-50 text-green-700 border border-green-100"
                  }`}>
                    {activeTicket.status}
                  </div>
                </div>

                {/* Messages Panel */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[360px] bg-gray-50/30">
                  {activeTicket.replies?.map((reply, idx) => {
                    const isAdmin = reply.from === "admin";
                    return (
                      <div key={idx} className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                          isAdmin
                            ? "bg-[#3E2723] text-white rounded-tl-none"
                            : "bg-white text-gray-800 border border-gray-100 rounded-tr-none"
                        }`}>
                          <p className="text-xs font-bold mb-1 opacity-70">
                            {isAdmin ? "Admin Support" : "You"}
                          </p>
                          <p className="text-xs font-medium leading-relaxed whitespace-pre-wrap">{reply.text}</p>
                          <p className="text-[9px] mt-2 text-right opacity-50">
                            {new Date(reply.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Reply Bar */}
                <form onSubmit={handleSendReply} className="p-4 bg-white border-t border-gray-100 flex gap-3">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your message here..."
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#3E2723] transition-all"
                  />
                  <button
                    type="submit"
                    className="w-10 h-10 shrink-0 bg-[#3E2723] hover:bg-[#3E2723]/90 text-white rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-55"
                    disabled={!replyText.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 h-full">
                <MessageSquare className="w-12 h-12 text-gray-200 mb-2" />
                <p className="text-sm font-bold text-gray-800">Select a support ticket</p>
                <p className="text-xs text-gray-500 max-w-xs text-center mt-1">Choose a ticket from the left panel to start chatting, or raise a new one.</p>
              </div>
            )}
          </div>

        </div>
      </div>



      {/* Raise Ticket Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in slide-in-from-bottom-5 duration-300">
            <div className="bg-[#3E2723] px-6 py-5 flex items-center justify-between text-white">
              <h3 className="font-bold text-base uppercase tracking-wider">Raise Support Ticket</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-white/60 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTicket} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Category</label>
                <select
                  value={newTicket.category}
                  onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3.5 text-xs text-gray-900 focus:outline-none focus:border-[#3E2723] transition-all cursor-pointer"
                >
                  <option value="Payout Issue">Payout Issue</option>
                  <option value="Inventory/Catalog">Inventory/Catalog</option>
                  <option value="Commission Dispute">Commission Dispute</option>
                  <option value="Verification/KYC">Verification/KYC</option>
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subject</label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  placeholder="Summarize your issue..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#3E2723] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Message</label>
                <textarea
                  value={newTicket.message}
                  onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                  placeholder="Provide details about your query..."
                  rows="4"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#3E2723] transition-all resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#3E2723] hover:bg-[#3E2723]/90 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-md"
                >
                  Submit Query
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const X = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

export default SellerSupport;
